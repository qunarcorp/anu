#!/usr/bin/env node
import platforms from '../consts/platforms';
import BUILD_OPTIONS from '../consts/buildOptions';
import resolve from 'resolve';
import CliBuilder from './cliBuilder';
import init from './commands/init';
import fs from 'fs-extra';
import { REACT_LIB_MAP } from '../consts/index';
import createPage from './commands/createPage';
// import build from './commands/build';
import install from './commands/install';
import chalk from 'chalk';
import * as path from 'path';
import config from '../config/config';
import installDefaltChaikaModule from '../tasks/chaikaMergeTask/installDefaultModule';
import '../tasks/chaikaMergeTask/injectChaikaEnv';
const { version } = require('../package.json');
import { runChaikaMergeTask } from '../tasks/chaikaMergeTask/index';
import { getMultiplePackDirPrefix } from '../tasks/chaikaMergeTask/isMutilePack';
import utils from '../packages/utils';
import runBeforeBuildOrWatch from "../tasks/runBeforeBuildOrWatch"; // TODO 需要把一部分逻辑迁移到这里
let cwd = process.cwd();



function isChaikaMode() {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
}

const cli: CliBuilder = new CliBuilder();
cli.checkNodeVersion('8.6.0');

cli.version = version;

cli.addCommand('init <app-name>', null, 'description: 初始化项目', {}, (appName: any) => {
    init(appName);
});

cli.addCommand(
    'install [name]',
    null,
    'description: 安装拆库模块. 文档: https://rubylouvre.github.io/nanachi/documents/chaika.html',
    {
        'branch': {
            desc: '指定分支',
            alias: 'b'
        },
        'platform': {
            desc: '指定构建平台',
            alias: 'p'
        }
    },
    function (name, opts) {
        install(name, opts);
    }
);

['page', 'component'].forEach(type => {
    cli.addCommand(
        `${type} <page-name>`,
        null,
        `description: 创建${type}s/<${type}-name>/index.js模版`,
        {},
        (name) => {
            createPage({ name, isPage: type === 'page' });
        });
});


/**
 * 从 cli 工具中拷贝 React 文件到 source 目录
*/
function copyReactLibFile(buildType: string) {
    const ReactLibName = REACT_LIB_MAP[buildType];
    const projectRootPath = utils.getProjectRootPath();
    const src = path.join(__dirname, '../lib', ReactLibName);
    const dist = isChaikaMode()
        ? path.join(
            projectRootPath,
            '.CACHE/nanachi',
            // 同时构建多个小程序
            getMultiplePackDirPrefix(),
            'source',
            ReactLibName
        )
        : path.join(projectRootPath, 'source', ReactLibName);
    fs.ensureFileSync(dist);
    fs.copySync(src, dist);
}

function getMergeDir() {
    return path.join(utils.getProjectRootPath(), '.CACHE/nanachi', getMultiplePackDirPrefix());
}

function getMultipleBuildTargetDir() {
    return utils.getDistDir();
}

function checkChaikaPatchInstalled() {
    try {
        resolve.sync('@qnpm/chaika-patch', {
            basedir: utils.getProjectRootPath(),
            moduleDirectory: path.join(utils.getProjectRootPath(), 'node_modules')
        });
    } catch (e) {
        console.log(chalk.green(`请先在你的项目里安装 @qnpm/chaika-patch@latest 模块`));
        process.exit(1);
    }

}

// // 检查 .gitignore 中是否有排除 shadowApp.js 的规则，没有则加入
// function checkAndAddGitIgnore() {
//     const projectRootPath = utils.getProjectRootPath();
//     const gitIgnorePath = path.join(projectRootPath, '.gitignore');
//     const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf-8');
//     const shadowAppJsRelativePath = path.join('shadowApp.js');
//     if (gitIgnoreContent.indexOf(shadowAppJsRelativePath) === -1) {
//         fs.appendFileSync(gitIgnorePath, `\n${shadowAppJsRelativePath}\n`);
//     }
// }

/**
 * 生成单包打包必须的入口文件：xxShadowApp.js，内容取自 source/app.json
 * 目录存放在 .Cache 中，不需要额外修改 .gitignore
 * @param buildType
 */
function generateShadowAppJsForSingleBundle(buildType: string) {
    const projectRootPath = utils.getProjectRootPath();
    const appJsPath = path.join(projectRootPath, 'source', 'app.js');
    // const shadowAppJsPath = path.join(projectRootPath, '.CACHE', `${buildType}ShadowApp.js`);
    const shadowAppJsPath = utils.getShadowAppJsPath();
    const appJsonPath = path.join(projectRootPath, 'source', 'app.json');

    if (fs.existsSync(appJsPath)) { // 额外的校验，允许执行单包打包的场景下不存在这个文件
        console.log(chalk.red('请注意，您现在使用的是单包模式，但是 source 目录下存在 app.js 文件，请联系 nanachi 开发者'));
        process.exit(1);
    }

    if (fs.existsSync(appJsonPath)) {
        const appJson = require(appJsonPath);
        const pages = appJson.pages;

        // 将 app.json 中的路径以 import 语句的方式写入 shadowApp.js 中
        const shadowAppJsContent = pages.map((v:string|{ route: string, platform: string })=>{
            if (typeof v === 'string') {
                // console.log('path.join(projectRootPath, \'source\', v)', path.join(projectRootPath, 'source', v));
                const relativePath = path.relative(path.dirname(shadowAppJsPath), path.join(projectRootPath, 'source', v));
                const formatPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`; // 解决 path.relative 不对本目录下加入 './' 的兼容
                return `import '${formatPath}';\n`;
            } else {
                if (v.platform === buildType) {
                    const relativePath = path.relative(path.dirname(shadowAppJsPath), path.join(projectRootPath, 'source', v.route));
                    const formatPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`; // 解决 path.relative 不对本目录下加入 './' 的兼容
                    return `import '${formatPath}';\n`;
                } else {
                    return '';
                }
            }
        }).join('');

        // 每次注入前先清空内容
        if (fs.existsSync(shadowAppJsPath)) {
            fs.writeFileSync(shadowAppJsPath, '');
        }
        // checkAndAddGitIgnore(); // 加入 shadowApp.js 到 .gitignore
        fs.ensureFileSync(shadowAppJsPath);
        fs.writeFileSync(shadowAppJsPath, shadowAppJsContent);
    } else {
        console.log(chalk.red(`请注意，您现在使用的是单包模式，但是 source 目录下不存在 app.json 文件，请联系 nanachi 开发者`));
        process.exit(1);
    }
}


platforms.forEach(function (el) {
    const { buildType, des, isDefault } = el;
    ['build', 'watch'].forEach(function (compileType) {
        cli.addCommand(
            `${compileType}:${buildType}`,
            isDefault ? compileType : null,
            des,
            BUILD_OPTIONS,
            async (options) => {
                let isChaika = isChaikaMode();

                // 针对单包打包，对一些输入参数做强制处理
                const isSingleBundleProcessFlag = utils.isSingleBundleProcess(compileType, options.component);
                let singleBundleSourcemap = config.sourcemap;
                if (isSingleBundleProcessFlag) {
                    // 增加对 home 和 platform 的处理，不允许也不需要单包处理
                    // platform 包也不能单包处理的原因是，里边有公共函数，且没有被 platform 的 pages 调用过，因此打包产物中不会包含这些公共函数
                    const pkgPath = path.join(cwd, 'package.json');
                    const pkg = require(pkgPath);

                    // TODO: 这里为了测试可以这么做，但是需要改了，不能写死包名
                    // TODO: 考虑给不同的包在 pkg 中加上标签，例如 home 包加上 main 标签，platform 包加上 common 标签，可以通过通用的标签来判断
                    if (pkg.name === 'nnc_home_qunar' || pkg.name === 'nnc_module_qunar_platform') {
                        console.log(chalk.red('请注意，您现在使用的是小程序的 home 包或者 platform 包，它们是不允许使用单包命令进行开发或者编译的'));
                        process.exit(1);
                    }

                    // 修改运行中的值，不去修改 pkg 中的值，因为多个进程同时会读取，所以就各取所需
                    isChaika = false; // isChaika 强制为 false 避免触发合包的操作
                    singleBundleSourcemap = true;
                    if (compileType === 'build') { // TODO 暂时先这么写测试，之后去掉
                        singleBundleSourcemap = true;
                    }
                    process.env.NANACHI_CHAIK_MODE === 'NOT_CHAIK_MODE'; // 防止其他代码调用 isChaikaMode() 时出现问题
                    console.log(chalk.green('提示：请注意您在使用 nanachi 的单包模式，部分参数会强制对齐到单包模式的要求\n'));
                    console.log(chalk.green('提示：另外单包模式可能会出现读取不到当前包配置的 alias，如果编译出现问题请检查 package.json 的 nanachi 字段上是否包含 alias 且当前包代码的路径别名都已经配置完成\n'))
                }

                Object.assign(config, {
                    buildType,
                    isWatch: compileType === 'watch',
                    noCurrent: !!options.noCurrent,
                    sourcemap: singleBundleSourcemap,
                    isSingleBundle: isSingleBundleProcessFlag // 给后续流程使用
                });

                // 当前默认的工作目录一定是监听对象之一，但如果启动时不想包含当前工作目录，则不会加入到 watcherList 中\
                // 不加入的话，不会进行 chaikaPlugin 中加入 contextDependencies 的操作，也不会被监听变动进行复制
                if (options.noCurrent) {
                    config.projectWatcherList = new Set();
                } else {
                    config.projectWatcherList = new Set([utils.getProjectRootPath()]);
                }

                if (isChaika) {
                    checkChaikaPatchInstalled();
                    fs.emptyDirSync(getMergeDir());
                    fs.emptyDirSync(getMultipleBuildTargetDir());

                    // 多工程项目，直接把目录插入到 projectWatcherList
                    // 目前多工程不支持单包
                    if (options.multiProject) {
                        const multiProject = options.multiProject.split(',').map((v:string)=>{
                            const isAbsolutePath = path.isAbsolute(v);
                            if (isAbsolutePath) {
                                return v;
                            } else {
                                return path.resolve(cwd, v);
                            }
                        });
                        config.projectWatcherList = new Set([...config.projectWatcherList, ...multiProject]);
                    }
                }

                // 单包模式也需要这个，因为一定会引用，最后会产生在 dist 目录下
                copyReactLibFile(buildType);

                if (isSingleBundleProcessFlag) {
                    generateShadowAppJsForSingleBundle(buildType);
                }

                if (isChaika) { // 如果是拆库模式，在主进程中执行合并打包等动作
                    try {
                        // 集成环境不安装默认，因为已经安装过了
                        if (!process.env.JENKINS_URL) {
                            await installDefaltChaikaModule(buildType);
                        }

                        await runChaikaMergeTask();
                    } catch (err) {
                        console.error('[chaika merge error]',err);
                        process.exit(1);
                    }
                }

                require('./commands/build')({
                    ...options,
                    watch: compileType === 'watch',
                    buildType
                });
            }
        );
    });
});


cli.run();
