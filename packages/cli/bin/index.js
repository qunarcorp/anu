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
const index_2 = require("../tasks/chaikaMergeTask/index");
const isMutilePack_1 = require("../tasks/chaikaMergeTask/isMutilePack");
const utils_1 = __importDefault(require("../packages/utils"));
const mergeUtils_1 = require("../tasks/chaikaMergeTask/mergeUtils");
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
    return __awaiter(this, void 0, void 0, function* () {
        yield install_1.default(name, opts);
    });
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
    fs_extra_1.default.ensureFileSync(dist);
    fs_extra_1.default.copySync(src, dist);
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
function generateShadowAppJsForSingleBundle(buildType) {
    const projectRootPath = utils_1.default.getProjectRootPath();
    const appJsPath = path.join(projectRootPath, 'source', 'app.js');
    const shadowAppJsPath = utils_1.default.getShadowAppJsPath();
    const appJsonPath = path.join(projectRootPath, 'source', 'app.json');
    if (fs_extra_1.default.existsSync(appJsPath)) {
        console.log(chalk_1.default.red('请注意，您现在使用的是单包模式，但是 source 目录下存在 app.js 文件，请联系 nanachi 开发者'));
        process.exit(1);
    }
    if (fs_extra_1.default.existsSync(appJsonPath)) {
        const appJson = require(appJsonPath);
        const pages = appJson.pages;
        const shadowAppJsContent = pages.map((v) => {
            if (typeof v === 'string') {
                const relativePath = path.relative(path.dirname(shadowAppJsPath), path.join(projectRootPath, 'source', v));
                const formatPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`;
                return `import '${formatPath}';\n`;
            }
            else {
                if (v.platform === buildType) {
                    const relativePath = path.relative(path.dirname(shadowAppJsPath), path.join(projectRootPath, 'source', v.route));
                    const formatPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`;
                    return `import '${formatPath}';\n`;
                }
                else {
                    return '';
                }
            }
        }).join('');
        if (fs_extra_1.default.existsSync(shadowAppJsPath)) {
            fs_extra_1.default.writeFileSync(shadowAppJsPath, '');
        }
        fs_extra_1.default.ensureFileSync(shadowAppJsPath);
        fs_extra_1.default.writeFileSync(shadowAppJsPath, shadowAppJsContent);
    }
    else {
        console.log(chalk_1.default.red('请注意，您现在使用的是单包模式，但是 source 目录下不存在 app.json 文件，请联系 nanachi 开发者'));
        process.exit(1);
    }
}
platforms_1.default.forEach(function (el) {
    const { buildType, des, isDefault } = el;
    ['build', 'watch'].forEach(function (compileType) {
        cli.addCommand(`${compileType}:${buildType}`, isDefault ? compileType : null, des, buildOptions_1.default, (options) => __awaiter(this, void 0, void 0, function* () {
            let isChaika = isChaikaMode();
            const isSingleBundleProcessFlag = utils_1.default.isSingleBundleProcess(compileType, options.component);
            let singleBundleSourcemap = config_1.default.sourcemap;
            if (isSingleBundleProcessFlag) {
                const pkgPath = path.join(cwd, 'package.json');
                const pkg = require(pkgPath);
                if (pkg.name === 'nnc_home_qunar' || pkg.name === 'nnc_module_qunar_platform') {
                    console.log(chalk_1.default.red('请注意，您现在使用的是小程序的 home 包或者 platform 包，它们是不允许使用单包命令进行开发或者编译的'));
                    process.exit(1);
                }
                isChaika = false;
                if (compileType === 'build' && process.env.JENKINS_URL) {
                    singleBundleSourcemap = true;
                }
                if (compileType === 'watch') {
                    console.log(chalk_1.default.yellow('检测到目前是单包打包的 watch 模式，此模式下不支持 sourcemap，已强制将其关闭'));
                    singleBundleSourcemap = false;
                }
                process.env.NANACHI_CHAIK_MODE === 'NOT_CHAIK_MODE';
                console.log(chalk_1.default.green('提示：请注意您在使用 nanachi 的单包模式，部分参数会强制对齐到单包模式的要求\n'));
                console.log(chalk_1.default.green('提示：另外单包模式可能会出现读取不到当前包配置的 alias，如果编译出现问题请检查 package.json 的 nanachi 字段上是否包含 alias 且当前包代码的路径别名都已经配置完成\n'));
            }
            Object.assign(config_1.default, {
                buildType,
                isWatch: compileType === 'watch',
                noCurrent: !!options.noCurrent,
                sourcemap: singleBundleSourcemap,
                isSingleBundle: isSingleBundleProcessFlag
            });
            if (options.noCurrent) {
                config_1.default.projectWatcherList = new Set();
            }
            else {
                config_1.default.projectWatcherList = new Set([utils_1.default.getProjectRootPath()]);
            }
            if (isChaika) {
                checkChaikaPatchInstalled();
                fs_extra_1.default.emptyDirSync(mergeUtils_1.getMergeDir());
                fs_extra_1.default.emptyDirSync(getMultipleBuildTargetDir());
                if (options.multiProject) {
                    const multiProject = options.multiProject.split(',').map((v) => {
                        const isAbsolutePath = path.isAbsolute(v);
                        if (isAbsolutePath) {
                            return v;
                        }
                        else {
                            return path.resolve(cwd, v);
                        }
                    });
                    config_1.default.projectWatcherList = new Set([...config_1.default.projectWatcherList, ...multiProject]);
                }
            }
            copyReactLibFile(buildType);
            if (isSingleBundleProcessFlag) {
                generateShadowAppJsForSingleBundle(buildType);
            }
            if (isChaika) {
                try {
                    if (!process.env.JENKINS_URL) {
                        yield installDefaultModule_1.default(buildType);
                    }
                    yield index_2.runChaikaMergeTask();
                }
                catch (err) {
                    console.error('[chaika merge error]', err);
                    process.exit(1);
                }
            }
            require('./commands/build')(Object.assign(Object.assign({}, options), { watch: compileType === 'watch', buildType }));
        }));
    });
});
cli.run();
