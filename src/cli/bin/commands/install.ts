import shelljs from 'shelljs';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';
import glob from 'glob';
import inquirer from 'inquirer';
const cwd = process.cwd();

interface IModeles {
    app_code: string;
    version: string;
    gitInstall: boolean;
    moduleName: string;
}

interface IHistoryModule extends IModeles {
    release_time: string;
    build_time: string;
    version_code: number;
    pkg_url: string;
    manifest_url: string;
    moduleName: string;
    /**
     * 模块的 git 地址
     */
    source_url: string;
}

interface IHistoryInfos {
    modules: IHistoryModule[];
    integrate_branch: string;
    [key: string]: any;
}

function writeVersions(moduleName: string, version: string) {
    let defaultVJson: { [key: string]: string } = {};
    let vPath = path.join(cwd, '.CACHE/verson.json');
    fs.ensureFileSync(vPath);
    try {
        defaultVJson = require(vPath) || {};
    } catch (err) {}
    defaultVJson[moduleName] = version;
    fs.writeFile(vPath, JSON.stringify(defaultVJson, null, 4), err => {
        if (err) {
            console.log(err);
        }
    });
}

function unPack(src: string, dist: string) {
    dist = path.join(dist, 'source');
    fs.ensureDirSync(dist);
    fs.emptyDirSync(dist);
    const unzipExec = shelljs.exec(`tar -zxvf ${src} -C ${dist}`, {
        silent: true
    });

    if (unzipExec.code) {
        // eslint-disable-next-line
        console.log(chalk.bold.red(unzipExec.stderr));
    }
    try {
        let files = glob.sync(dist + '/**', { nodir: true, dot: true });
        files.forEach(function (el: string) {
            let fileName = path.basename(el);
            if (/\/package\.json$/.test(el) || /\/\.\w+$/.test(el)) {
                fs.removeSync(path.join(dist, '..', fileName));
                fs.moveSync(el, path.join(dist, '..', fileName));
            }
        });
    } catch (err) {
        // eslint-disable-next-line
    }
}

function isOldChaikaConfig(name = '') {
    return /^[A-Za-z0-9_\.\+-]+@#?[A-Za-z0-9_\.\+-]+$/.test(name);
}

function downLoadGitRepo(target: string, branch: string) {
    let cmd = `git clone ${target} -b ${branch}`;
    let distDir = path.join(cwd, '.CACHE', 'download');
    let gitRepoName = target
        .split('/')
        .pop()
        .replace(/\.git$/, '');
    fs.removeSync(path.join(distDir, gitRepoName));
    fs.ensureDirSync(distDir);
    let std = shelljs.exec(cmd, {
        cwd: distDir,
        silent: true
    });

    if (/fatal:/.test(std.stderr)) {
        console.log(chalk.bold.red(std.stderr));
        process.exit(1);
    }

    writeVersions(gitRepoName, branch);

    console.log(chalk.green(`安装依赖包 ${target} 成功. VERSION: ${branch}`));
}

function getNanachiChaikaConfig() {
    let nanachiUserConfig: any = {};
    try {
        nanachiUserConfig = require(path.join(cwd, 'nanachi.config'));
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

    try {
        let res = await axios(axiosConfig);
        let libDist = path.join(cwd, `.CACHE/lib/${path.basename(patchModuleName)}`);
        fs.ensureFileSync(libDist);
        fs.writeFile(libDist, res.data, function (err) {
            if (err) return console.log(err);
            console.log(chalk.green(`安装依赖包 ${binaryLibUrl} 成功.`));
            unPack(libDist, path.join(cwd, `.CACHE/download/${patchModuleName}`));
        });
        writeVersions(patchModuleName, binaryLibUrl.split('/').pop());
    } catch (err) {
        console.log(chalk.bold.red(`${err.toString()} for ${binaryLibUrl}`));
    }
}

function downLoadPkgDepModule() {
    var pkg = require(path.join(cwd, 'package.json'));
    var depModules = pkg.modules || {};
    let depKey = Object.keys(depModules);
    const nanachiChaikaConfig = getNanachiChaikaConfig();
    if (!depKey.length) {
        // eslint-disable-next-line
        console.log(chalk.bold.red('未在package.json中发现拆库依赖包, 全量安装失败.'));
        process.exit(1);
    }

    depKey.forEach(function (key) {
        // 用户自定义根据tag或者branch下载模块包
        if (
            Object.keys(nanachiChaikaConfig).length &&
            nanachiChaikaConfig.onInstallTarball &&
            typeof nanachiChaikaConfig.onInstallTarball === 'function'
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
            // 兼容老的chaika
            const patch = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
            patch.patchOldChaikaDownLoad(
                `${key}@${depModules[key]}`,
                downLoadGitRepo,
                downLoadBinaryLib
            );
        } else {
        }
    });
}

function handleRemote(opts: any) {
    const patch = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
    patch.getBizModule(opts, async (historyInfos: IHistoryInfos) => {
        const depModules = [
            {
                app_code: 'nnc_home_qunar',
                version: historyInfos.integrate_branch,
                gitInstall: true,
                moduleName: 'nnc_home_qunar'
            }
        ];
        const pkg = require(path.join(process.cwd(), 'package.json'));
        // 过滤项目自身
        const skipModules = [pkg.name];
        const modules: IModeles[] = []
            .concat(historyInfos.modules, depModules)
            .filter(c => !skipModules.includes(c.moduleName));
        /**
         * inquirer 中的 disabled 之后不会出现在 answer 中
         * 而 nnc_home_qunar 和 nnc_module_qunar_platform 又是必须依赖
         * 单独存放一个数组
         */
        const depModuleNames: string[] = [];
        const moduleNames = modules.map(({ app_code, version, gitInstall, moduleName }) => {
            /**
             * gitInstall => @#
             * binaryInstall => @
             */
            const gitDivide = gitInstall ? '#' : '';
            // 去掉 nnc_ 和 nnc_module_
            const ss = `${app_code.replace(/^nnc_(module_)?/, '')}@${gitDivide}${version}`;
            if (['nnc_home_qunar', 'nnc_module_qunar_platform'].includes(moduleName)) {
                depModuleNames.push(ss);
                return {
                    name: moduleName,
                    value: ss,
                    // checked: true,
                    disabled: '依赖项'
                };
            }
            return ss;
        });

        const answers: any = await inquirer
            .prompt({
                type: 'checkbox',
                name: 'selectedModules',
                message: '请选择需要安装的模块, 以下列出的是最新线上版依赖的模块',
                choices: moduleNames
            })
            .catch(error => {
                console.log('inquirer.prompt catch error', error);
            });

        const willInstallModules = [].concat(answers.selectedModules, depModuleNames);
        willInstallModules.forEach((name: any) => {
            patch.patchOldChaikaDownLoad(name, downLoadGitRepo, downLoadBinaryLib);
        });
    });
}

export default function (name: string, opts: any) {
    if (process.env.NANACHI_CHAIK_MODE != 'CHAIK_MODE') {
        // eslint-disable-next-line
        console.log(
            chalk.bold.red(
                '需在package.json中配置{"nanachi": {"chaika": true }}, 拆库开发功能请查阅文档: https://qunarcorp.github.io/anu/documents/chaika.html'
            )
        );
        process.exit(1);
    }

    if (opts.remote) {
        handleRemote(opts);
        return;
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
        //nanachi install package.json 中配置的所有包
        downloadInfo = {
            type: 'all',
            lib: ''
        };
    }

    // nanachi install moduleName@#branchName
    // nanachi install moduleName@tagName
    if (isOldChaikaConfig(name)) {
        // 兼容老的chaika
        const patch = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
        patch.patchOldChaikaDownLoad(name, downLoadGitRepo, downLoadBinaryLib);
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
            downLoadPkgDepModule();
        default:
            break;
    }
}
