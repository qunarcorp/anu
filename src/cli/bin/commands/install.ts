import shelljs from 'shelljs';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';
import glob from 'glob';
import { getMultiplePackDirPrefix } from '../../tasks/chaikaMergeTask/isMutilePack';
import config, {projectSourceType, sourceTypeString} from '../../config/config';
import utils from '../../packages/utils';
import platforms, { Platform } from '../../consts/platforms';
const cwd = process.cwd();

// TODO: input 和 output 有更加合理的方案去判断（从源头），但是成本有点大，先用这个也没问题
// 根据传入的目录路径，判断一个包是否是 projectSourceType.sourceType 的 input 源码类型
function isInputPackage(dirPath: string): sourceTypeString | undefined {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`[isInputPackage] 输入路径不存在 ${dirPath}`);
    }

    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        return 'input';
    } else {
        return undefined;
    }
}

// 根据传入的目录路径，判断一个包是否是 projectSourceType.sourceType 的 output 产物类型
function isOutputPackage(dirPath: string): sourceTypeString | undefined {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`[isOutputPackage] 输入路径不存在 ${dirPath}`);
    }

    // 判断目录下是否存在 package.json，不存在则返回 'output' ， 否则返回 undefined
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return 'output';
    } else {
        return undefined;
    }
}

// 用于写入新版 nanachi 下载包的类型，保存在本地文件（因为需要跨进程访问）
// 在 nanachi install 之后 （如果有），以及 nanachi build 和 watch 拷贝工作区代码之前执行
// 因此只记录 install 的包的类型，工作区拷贝过去的包的类型不在文件中记录，而是根据运行时的命令动态设置
function writeProjectSourceTypeList() {
    console.log('正在记录下载依赖的类型');

    let downloadCacheDir = path.join(cwd, '.CACHE/download', getMultiplePackDirPrefix());
    let defaultJson: { [key: string]: any } = {};
    const listResult: projectSourceType[] = [];
    const writePath = path.join(cwd, `.CACHE/type${getMultiplePackDirPrefix()}.json`);
    fs.ensureFileSync(writePath);

    try {
        defaultJson = require(writePath) || {
            projectSourceTypeList: []
        };
    } catch ( err ) {}

    // 开始遍历 downloadCacheDir 下所有目录，判断是否是 input 或者 output 类型
    const dirs = fs.readdirSync(downloadCacheDir);
    // 此处不包含工作区那个项目，还没 copy
    dirs.forEach((dirName: string) => {
        const dirPath: string = path.join(downloadCacheDir, dirName);
        const type: sourceTypeString | undefined = isInputPackage(dirPath) || isOutputPackage(dirPath);
        switch (type) {
            case 'input': {
                listResult.push({
                    name: dirName,
                    path: dirPath,
                    sourceType: 'input'
                });
                break;
            }
            case 'output': { // output 类型还有一层，是区分产物和sourcemap目录的
                listResult.push({
                    name: dirName,
                    path: dirPath + '/dist',
                    sourcemap: dirPath + '/sourcemap',
                    sourceType: 'output'
                });
                break;
            }
            default: {
                console.error(chalk.red('[writeProjectSourceTypeList] 出现了无法识别的类型，请联系开发者'));
                process.exit(1);
            }
        }
        console.log(chalk.green(`[writeProjectSourceTypeList] 记录路径 ${dirName}，类型为 ${type}`));
    });

    // 覆写掉 projectSourceTypeList 中旧的内容，因为多个包有可能一个一个下载，也可能一起下载，每次全量扫描目录覆写的成本很低
    // 而且我不需要关注 nanachi install 到底传入的是什么参数，来分辨哪个包是新增的，或者重新下载的
    defaultJson.projectSourceTypeList = listResult;
    fs.writeFileSync(writePath, JSON.stringify(defaultJson, null, 4));
    console.log('依赖类型记录成功');
    return listResult;
}


function writeVersions(moduleName: string, version: string) {
    let defaultVJson: { [key: string]: string } = {};
    let vPath = path.join(cwd, `.CACHE/verson${getMultiplePackDirPrefix()}.json`);
    fs.ensureFileSync(vPath);
    try {
        defaultVJson = require(vPath) || {};
    } catch (err) {}

    defaultVJson[moduleName] = version;
    fs.writeFileSync(vPath, JSON.stringify(defaultVJson, null, 4));
}


function unPack(src: string, dist: string) {
    /*
    src: /Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/lib/nnc_module_qunar_platform/wx
    dist: /Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_platform
    */
    const distSource = path.join(dist, 'source');
    fs.ensureDirSync(distSource);
    fs.emptyDirSync(distSource);
    const unzipExec = shelljs.exec(`tar -zxvf ${src} -C ${distSource}`, {
        silent: true
    });

    if (unzipExec.code) {
        // eslint-disable-next-line
        console.log(chalk.bold.red(unzipExec.stderr));
    }

    // 解压后针对产物类型和源码类型做判断，首先校验压缩后的目录
    const type: sourceTypeString | undefined = isInputPackage(distSource) || isOutputPackage(distSource);
    switch (type) {
        case 'input': {
            try {
                let files = glob.sync(distSource + '/**', { nodir: true, dot: true });
                files.forEach(function (el: string) {
                    let fileName = path.basename(el);
                    if (
                        /\/package\.json$/.test(el)
                        || /\/\.\w+$/.test(el)
                    ) {
                        fs.removeSync(path.join(distSource, '..', fileName));
                        fs.moveSync(el, path.join(distSource, '..', fileName));
                    }
                });

            } catch (err) {
                // eslint-disable-next-line
                console.error('[unPack error]:', err);
                process.exit(1);
            }
            break;
        }
        case 'output': {
            // 检查解压缩目录下是否存在目标平台的产物
            const targetPlatformDir = path.join(distSource, config.buildType);
            if (!fs.existsSync(targetPlatformDir)) {
                console.error(chalk.red(`[unPack error] 解压后的 ${distSource} 目录下不存在 ${config.buildType} 目录，请手动检查下该版本号下载的压缩包中是否有对应平台的产物！`));
                process.exit(1);
            }

            // 此时解压目录下存在 /${platform}/dist & /${platform}/sourcemap
            const outputCodeDistDir = path.join(targetPlatformDir, 'dist');
            const outputCodeSourcemapDir = path.join(targetPlatformDir, 'sourcemap');
            if (!fs.existsSync(outputCodeDistDir) || !fs.existsSync(outputCodeSourcemapDir)) {
                console.error(chalk.red(`[unPack error] 解压后的 ${targetPlatformDir} 目录下不存在 dist 或者 sourcemap 目录，请手动检查下该版本号下载的压缩包中是否有对应平台的产物！`));
                process.exit(1);
            }

            const finalDistDir = path.join(dist, 'dist');
            const finalSourcemapDir = path.join(dist, 'sourcemap');
            fs.ensureDirSync(finalDistDir);
            fs.ensureDirSync(finalSourcemapDir);
            fs.copySync(outputCodeDistDir, finalDistDir);
            fs.copySync(outputCodeSourcemapDir, finalSourcemapDir);
            fs.removeSync(distSource); // 特定平台的文件夹转移完成后，其余平台的文件都可以删除
            break;
        }
        default: {
            console.error(chalk.red('[install-unPack] 出现了无法识别的类型，请联系开发者'));
            process.exit(1);
        }
    }
}

function isOldChaikaConfig(name = "") {
    return /^[A-Za-z0-9_\.\+-]+@#?[A-Za-z0-9_\.\+-]+$/.test(name);
}

function downLoadGitRepo(target: string, branch: string) {
    let cmd = `git clone ${target} -b ${branch}`;
    let distDir = path.join(cwd, '.CACHE/download', getMultiplePackDirPrefix());
    let gitRepoName = target.split('/').pop().replace(/\.git$/, '');
    fs.removeSync(path.join(distDir, gitRepoName));
    fs.ensureDirSync(distDir);

    let std = shelljs.exec(
        cmd,
        {
            cwd: distDir,
            silent: true
        }
    );

    if (/fatal:/.test(std.stderr)) {
        // eslint-disable-next-line
        console.log(chalk.bold.red(std.stderr));
        process.exit(1);
    }


    writeVersions(gitRepoName, branch);

    // eslint-disable-next-line
    console.log(chalk.green(`安装依赖包 ${target} 成功. VERSION: ${branch}`));
}


function getNanachiChaikaConfig() {
    let nanachiUserConfig: any = {};
    try {
        nanachiUserConfig = require(path.join(utils.getProjectRootPath(), 'nanachi.config'));
    } catch (err) {
        if (/SyntaxError/.test(err)) {
            // eslint-disable-next-line
            console.log(err);
        }
    }
    return nanachiUserConfig.chaikaConfig || {};
}

async function downLoadBinaryLib(binaryLibUrl: string, patchModuleName: string) {

    let axiosConfig = {
        url: binaryLibUrl,
        type: 'GET',
        responseType: 'arraybuffer'
    };
    let data = '';

    try {
        let res = await axios(axiosConfig);
        data = res.data;
    } catch (err) {
        console.log(chalk.bold.red(`${err.toString()} for ${binaryLibUrl}`));
    }
    const libDist = path.join(
        utils.getProjectRootPath(),
        `.CACHE/lib/${path.basename(patchModuleName)}`,
        getMultiplePackDirPrefix()
    );

    fs.ensureFileSync(libDist);
    try {
        fs.writeFileSync(libDist, data);
        console.log(chalk.green(`安装依赖包 ${binaryLibUrl} 成功.`));
        const unPackDist = path.join(
            utils.getProjectRootPath(),
            '.CACHE/download',
            getMultiplePackDirPrefix(),
            patchModuleName
        );
        unPack(libDist, unPackDist);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }

    writeVersions(patchModuleName, binaryLibUrl.split('/').pop());
}


async function downLoadPkgDepModule() {
    var pkg = require(path.join(cwd, 'package.json'));
    var depModules = pkg.modules || {};
    let depKey = Object.keys(depModules);
    const nanachiChaikaConfig = getNanachiChaikaConfig();
    if (!depKey.length) {
        // eslint-disable-next-line
        console.log(chalk.bold.red('未在package.json中发现拆库依赖包, 全量安装失败.'));
        process.exit(1);
    }

    for (const key of depKey) {
        // 用户自定义根据tag或者branch下载模块包
        if (
            Object.keys(nanachiChaikaConfig).length
            && nanachiChaikaConfig.onInstallTarball
            && typeof nanachiChaikaConfig.onInstallTarball === 'function'
        ) {
            // nanachi.config.js
            /**
             * {
             *   onInstallTarball: function(moduleName, version) {
             *      // 该函数用于用户自定义返回可远程下载的包
             *      return https://xxx/yyy/version.git
             *   }
             * }
             */
            let gitRepo = nanachiChaikaConfig.onInstallTarball(key, depModules[key]);
            // 下载对应的tag或者branch
            downLoadGitRepo(gitRepo, depModules[key]);
        } else if (isOldChaikaConfig(`${key}@${depModules[key]}`)) {

            // // 兼容老的chaika
            // require('@qnpm/chaika-patch')(
            //     `${key}@${depModules[key]}`,
            //     downLoadGitRepo,
            //     downLoadBinaryLib,
            // )

            const ret = require(
                path.join(utils.getProjectRootPath(), 'node_modules', '@qnpm/chaika-patch/mutiInstall')
            )(`${key}@${depModules[key]}`);
            if (ret.type === 'git') {
                downLoadGitRepo(ret.gitRepo, ret.branchName);
            } else {
                await downLoadBinaryLib(ret.patchModuleUrl, ret.patchModuleName);
            }
        } else {

        }
    }
}


export default async function (name: string, opts: any) {

    if (opts.platform && platforms.some((v: Platform) => v.buildType === opts.platform)) {
        config.buildType = opts.platform;
    }

    console.log(chalk.bold.yellow(`传入的平台参数：${opts.platform}，处理后的平台参数：${config.buildType}`));

    if (process.env.NANACHI_CHAIK_MODE != 'CHAIK_MODE') {
        // eslint-disable-next-line
        console.log(chalk.bold.red('需在package.json中配置{"nanachi": {"chaika": true }}, 拆库开发功能请查阅文档: https://rubylouvre.github.io/nanachi/documents/chaika.html'));
        process.exit(1);
    }

    let downloadInfo: {
        type: string;
        lib: string;
        version?: string;
    } = {
        type: '',
        lib: ''
    };

    if (!name && !opts.branch) {
        // nanachi install package.json 中配置的所有包
        downloadInfo = {
            type: 'all',
            lib: ''
        };
    }

    // nanachi install moduleName@#branchName
    // nanachi install moduleName@tagName
    if (isOldChaikaConfig(name)) {
        // 兼容老的chaika
        // const nodeModulePath =
        const ret = require(path.join(utils.getProjectRootPath(), 'node_modules', '@qnpm/chaika-patch/mutiInstall'))(name);
        if (ret.type === 'git') {
            downLoadGitRepo(ret.gitRepo, ret.branchName);
        } else {
            await downLoadBinaryLib(ret.patchModuleUrl, ret.patchModuleName);
        }
        return;
    }

    //nanachi install xxx.zip
    // if (name && !/\.git$/.test(name) ) {
    //     downloadInfo = {
    //         type: 'binary',
    //         lib: name
    //     };
    // }
    // nanachi install xxx.git -b branchName
    if (/\.git$/.test(name) && opts.branch && typeof opts.branch === 'string') {
        downloadInfo = {
            type: 'git',
            lib: name,
            version: opts.branch
        };
    }
    let { type, lib, version } = downloadInfo;

    switch (type) {
        case 'git':
            downLoadGitRepo(lib, version);
            break;
        // case 'binary':
        //     downLoadBinaryLib(lib);
        case 'all':
            await downLoadPkgDepModule();
        default:
            break;
    }

    // 不管是执行什么方式的 install，都会覆写一下这个类型文件
    writeProjectSourceTypeList();
}



