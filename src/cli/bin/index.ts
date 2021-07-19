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
    console.log('[copyReactLibFile]执行中------------------------');
    console.log('dist:', dist);
    console.log('isChaikaMode():', isChaikaMode());
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

platforms.forEach(function (el) {
    const { buildType, des, isDefault } = el;
    ['build', 'watch'].forEach(function (compileType) {
        cli.addCommand(
            `${compileType}:${buildType}`,
            isDefault ? compileType : null,
            des,
            BUILD_OPTIONS,
            async (options) => {
                console.log('start build------------------------');
                const isChaika = isChaikaMode();
                console.log('[isChaika]------------------------', isChaika);
                Object.assign(config, {
                    buildType
                });
                console.log('[isChaconfigika]------------------------', config);
                if (isChaika) {
                    checkChaikaPatchInstalled();
                    console.log('[checkChaikaPatchInstalled]执行完成------------------------');
                    fs.emptyDirSync(getMergeDir());
                    fs.emptyDirSync(getMultipleBuildTargetDir());
                }

                copyReactLibFile(buildType);
                console.log('[copyReactLibFile]执行完成------------------------');

                if (isChaika) {
                    try {
                        installDefaltChaikaModule(buildType);
                        console.log('[installDefaltChaikaModule]执行完成------------------------');
                        await runChaikaMergeTask();
                        console.log('[runChaikaMergeTask]执行完成------------------------');
                    } catch (err) {
                        console.error(err);
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