#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const platforms_1 = __importDefault(require("../consts/platforms"));
const buildOptions_1 = __importDefault(require("../consts/buildOptions"));
const resolve_1 = __importDefault(require("resolve"));
const cliBuilder_1 = __importDefault(require("./cliBuilder"));
const init_1 = __importDefault(require("./commands/init"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const index_1 = require("../consts/index");
const createPage_1 = __importDefault(require("./commands/createPage"));
const install_1 = __importDefault(require("./commands/install"));
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("../config/config"));
const installDefaultModule_1 = __importDefault(require("../tasks/chaikaMergeTask/installDefaultModule"));
require("../tasks/chaikaMergeTask/injectChaikaEnv");
const { version } = require('../package.json');
const index_2 = __importDefault(require("../tasks/chaikaMergeTask/index"));
const isMutilePack_1 = require("../tasks/chaikaMergeTask/isMutilePack");
const utils_1 = __importDefault(require("../packages/utils"));
let cwd = process.cwd();
function isChaikaMode() {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
}
const cli = new cliBuilder_1.default();
cli.checkNodeVersion('8.6.0');
cli.version = version;
cli.addCommand('init <app-name>', null, 'description: 初始化项目', {}, (appName) => {
    init_1.default(appName);
});
cli.addCommand('install [name]', null, 'description: 安装拆库模块. 文档: https://rubylouvre.github.io/nanachi/documents/chaika.html', {
    'branch': {
        desc: '指定分支',
        alias: 'b'
    },
    'platform': {
        desc: '指定构建平台',
        alias: 'p'
    }
}, function (name, opts) {
    install_1.default(name, opts);
});
['page', 'component'].forEach(type => {
    cli.addCommand(`${type} <page-name>`, null, `description: 创建${type}s/<${type}-name>/index.js模版`, {}, (name) => {
        createPage_1.default({ name, isPage: type === 'page' });
    });
});
function copyReactLibFile(buildType) {
    const ReactLibName = index_1.REACT_LIB_MAP[buildType];
    const projectRootPath = utils_1.default.getProjectRootPath();
    const src = path.join(__dirname, '../lib', ReactLibName);
    const dist = isChaikaMode()
        ? path.join(projectRootPath, '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix(), 'source', ReactLibName)
        : path.join(projectRootPath, 'source', ReactLibName);
    console.log('[copyReactLibFile]执行中------------------------');
    console.log('dist:', dist);
    console.log('isChaikaMode():', isChaikaMode());
    fs_extra_1.default.ensureFileSync(dist);
    fs_extra_1.default.copySync(src, dist);
}
function getMergeDir() {
    return path.join(utils_1.default.getProjectRootPath(), '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix());
}
function getMultipleBuildTargetDir() {
    return utils_1.default.getDistDir();
}
function checkChaikaPatchInstalled() {
    try {
        resolve_1.default.sync('@qnpm/chaika-patch', {
            basedir: utils_1.default.getProjectRootPath(),
            moduleDirectory: path.join(utils_1.default.getProjectRootPath(), 'node_modules')
        });
    }
    catch (e) {
        console.log(chalk_1.default.green(`请先在你的项目里安装 @qnpm/chaika-patch@latest 模块`));
        process.exit(1);
    }
}
platforms_1.default.forEach(function (el) {
    const { buildType, des, isDefault } = el;
    ['build', 'watch'].forEach(function (compileType) {
        cli.addCommand(`${compileType}:${buildType}`, isDefault ? compileType : null, des, buildOptions_1.default, (options) => __awaiter(this, void 0, void 0, function* () {
            console.log('start build------------------------');
            const isChaika = isChaikaMode();
            console.log('[isChaika]------------------------', isChaika);
            Object.assign(config_1.default, {
                buildType
            });
            console.log('[isChaconfigika]------------------------', config_1.default);
            if (isChaika) {
                checkChaikaPatchInstalled();
                console.log('[checkChaikaPatchInstalled]执行完成------------------------');
                fs_extra_1.default.emptyDirSync(getMergeDir());
                fs_extra_1.default.emptyDirSync(getMultipleBuildTargetDir());
            }
            copyReactLibFile(buildType);
            console.log('[copyReactLibFile]执行完成------------------------');
            if (isChaika) {
                try {
                    installDefaultModule_1.default(buildType);
                    console.log('[installDefaltChaikaModule]执行完成------------------------');
                    yield index_2.default();
                    console.log('[runChaikaMergeTask]执行完成------------------------');
                }
                catch (err) {
                    console.error(err);
                    process.exit(1);
                }
            }
            require('./commands/build')(Object.assign(Object.assign({}, options), { watch: compileType === 'watch', buildType }));
        }));
    });
});
cli.run();
