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
import runChaikaMergeTask from '../tasks/chaikaMergeTask/index';
import { getMultiplePackDirPrefix } from '../tasks/chaikaMergeTask/isMutilePack';
import utils from '../packages/utils';
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

function isSingleBundleProcess(compileType: string, component: string | undefined) {
    // 目前满足单包模式的条件
    // 1. nanachi build --component
    // 2. nanachi watch --component
    return (compileType === 'build' && component) || (compileType === 'watch' && component);
}

// 检查 .gitignore 中是否有排除 shadowApp.js 的规则，没有则加入
function checkAndAddGitIgnore() {
    const projectRootPath = utils.getProjectRootPath();
    const gitIgnorePath = path.join(projectRootPath, '.gitignore');
    const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf-8');
    const shadowAppJsRelativePath = path.join('shadowApp.js');
    if (gitIgnoreContent.indexOf(shadowAppJsRelativePath) === -1) {
        fs.appendFileSync(gitIgnorePath, `\n${shadowAppJsRelativePath}\n`);
    }
}

function generateShadowAppJsForSingleBundle(buildType: string) {
    const projectRootPath = utils.getProjectRootPath();
    const appJsPath = path.join(projectRootPath, 'source', 'app.js');
    const shadowAppJsPath = path.join(projectRootPath, 'shadowApp.js');
    const appJsonPath = path.join(projectRootPath, 'source', 'app.json');
   
    if (fs.existsSync(appJsPath)) { // 额外的校验
        console.log(chalk.red(`请注意，您现在使用的是单包模式，但是 source 目录下存在 app.js 文件，请联系 nanachi 开发者`));
        process.exit(1);
    }

    if (fs.existsSync(appJsonPath)) {
        const appJson = require(appJsonPath);
        const pages = appJson.pages;

        // 将 app.json 中的路径以 import 语句的方式写入 app.js 中
        const shadowAppJsContent = pages.map((v:string|{ route: string, platform: string })=>{
            if (typeof v === 'string') {
                return `import './source/${v}';\n`;
            } else {
                if (v.platform === buildType) {
                    return `import './source/${v.route}';\n`;
                } else {
                    return '';
                }
            }
        }).join('');

        // 每次注入前先清空内容
        if (fs.existsSync(shadowAppJsPath)) {
            fs.writeFileSync(shadowAppJsPath, '');
        }
        checkAndAddGitIgnore(); // 加入 shadowApp.js 到 .gitignore
        fs.writeFileSync(shadowAppJsPath, shadowAppJsContent);
        return true;
    } else {
        return false;
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
                const isSingleBundleProcessFlag = isSingleBundleProcess(compileType, options.component)
                let singleBundleSourcemap = config.sourcemap;
                if (isSingleBundleProcessFlag) {
                    // 增加对 home 包的处理，home 包不允许也不需要单包处理
                    const pkgPath = path.join(process.cwd(), 'package.json');
                    const pkg = require(pkgPath);
                    if (pkg.name === 'nnc_home_qunar') {
                        console.log(chalk.red(`请注意，您现在使用的是小程序的主包，主包是不允许使用单包命令进行开发或者编译的`));
                        process.exit(1);
                    }

                    isChaika = false; // isChaika 强制为 false 避免触发合包的操作
                    singleBundleSourcemap = true; // 单包模式中需要 sourcemap，相当于补丁，因为基本所有子包都不会设置 sourcemap = true
                    process.env.NANACHI_CHAIK_MODE === 'NOT_CHAIK_MODE'; // 防止其他代码调用 isChaikaMode() 时出现问题
                    console.log(chalk.green(`提示：请注意您在使用 nanachi 的单包模式，部分参数会强制对齐到单包模式的要求\n`));
                    console.log(chalk.green(`提示：另外单包模式可能会出现读取不到当前包配置的 alias，如果编译出现问题请检查 package.json 的 nanachi 字段上是否包含 alias 且当前包代码的路径别名都已经配置完成\n`))
                }

                Object.assign(config, {
                    buildType,
                    sourcemap: singleBundleSourcemap,
                    isSingleBundle: isSingleBundleProcessFlag // 给后续流程使用
                });

                if (isChaika) {
                    checkChaikaPatchInstalled();
                    fs.emptyDirSync(getMergeDir());
                    fs.emptyDirSync(getMultipleBuildTargetDir());

                    // 多工程项目
                    if (options.multiProject) {
                        const multiProject = options.multiProject.split(',').map((v:string)=>{
                            const isAbsolutePath = path.isAbsolute(v);
                            if (isAbsolutePath) {
                                return v;
                            } else {
                                return path.resolve(cwd, v);
                            }   
                        });
                        config.multiProject = multiProject;
                    }
                }

                copyReactLibFile(buildType);

                // 如果是单包模式，还需要给子包注入 import 语句到 app.js
                // 如果注入了 app.js，通过这个标识可以在后续流程中对这个 app.js 再进行删除
                Object.assign(config, {
                    hasNewAppjs: isSingleBundleProcessFlag && generateShadowAppJsForSingleBundle(buildType)
                });


                if (isChaika) {
                    try {
                        // 集成环境不安装默认，因为已经安装过了
                        if (!process.env.JENKINS_URL) {
                            await installDefaltChaikaModule(buildType);
                        }
                        
                        await runChaikaMergeTask();
                    } catch (err) {
                        console.error('[build error]',err);
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