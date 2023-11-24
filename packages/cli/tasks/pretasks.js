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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const chalk_1 = __importDefault(require("chalk"));
const cross_spawn_1 = __importDefault(require("cross-spawn"));
const axios_1 = __importDefault(require("axios"));
const ora_1 = __importDefault(require("ora"));
const index_1 = require("../consts/index");
const resolve_1 = __importDefault(require("resolve"));
const config_1 = __importDefault(require("../config/config"));
const isMutilePack_1 = __importDefault(require("./chaikaMergeTask/isMutilePack"));
const utils = require('../packages/utils/index');
const cliRoot = path.resolve(__dirname, '..');
const getSubpackage = require('../packages/utils/getSubPackage');
let cwd = process.cwd();
function getRubbishFiles(buildType) {
    const projectRootPath = utils.getProjectRootPath();
    let fileList = ['package-lock.json', 'yarn.lock'];
    buildType === 'quick'
        ? fileList = fileList.concat([
            'dist', 'build', 'sign', 'src', 'babel.config.js',
        ].map(function (dir) {
            return path.join(projectRootPath, dir);
        }))
        : fileList = fileList.concat([utils.getDistDir(), path.join(projectRootPath, 'web')]);
    let libList = Array.from(new Set(Object.values(index_1.REACT_LIB_MAP)));
    if (!isMutilePack_1.default()) {
        libList = libList.filter(function (libName) {
            return libName !== index_1.REACT_LIB_MAP[buildType];
        });
    }
    else {
        libList = [];
    }
    fileList = fileList.concat(libList.map(function (libName) {
        return path.join(projectRootPath, 'source', libName);
    }));
    return fileList.map(function (file) {
        return {
            id: file,
            ACTION_TYPE: 'REMOVE'
        };
    });
}
function getQuickPkgFile() {
    let projectPkgPath = path.join(cwd, 'package.json');
    let projectPkg = require(projectPkgPath);
    let quickPkg = require(path.join(cliRoot, 'packages/quickHelpers/quickInitConfig/package.json'));
    ['scripts', 'devDependencies'].forEach(function (key) {
        projectPkg[key] = projectPkg[key] || {};
        Object.assign(projectPkg[key], quickPkg[key]);
    });
    let ret = [
        {
            id: projectPkgPath,
            content: JSON.stringify(projectPkg, null, 4),
            ACTION_TYPE: 'WRITE'
        }
    ];
    if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
        const curProjectPath = path.join(utils.getProjectRootPath(), 'package.json');
        let curProjectPkg = require(curProjectPath);
        curProjectPkg.scripts = curProjectPkg.scripts || {};
        ['scripts', "devDependencies"].forEach(function (key) {
            Object.assign(curProjectPkg[key], quickPkg[key]);
        });
        ret = ret.concat([
            {
                id: curProjectPath,
                content: JSON.stringify(curProjectPkg, null, 4),
                ACTION_TYPE: 'WRITE'
            }
        ]);
    }
    return ret;
}
function getCopyFiles() {
    const files = [
        'sitemap.json'
    ];
    return files.map(fileName => ({
        id: path.join(cwd, 'source', fileName),
        dist: path.join(utils.getProjectRootPath(), 'src', fileName),
        ACTION_TYPE: 'COPY'
    }));
}
function getQuickBuildConfigFile() {
    const baseDir = path.join(cliRoot, 'packages/quickHelpers/quickInitConfig');
    let signDir = baseDir;
    const sign = 'sign', babelConfig = 'babel.config.js';
    try {
        const userSignDir = path.join(cwd, 'source/sign');
        const files = fs.readdirSync(userSignDir);
        if (files.length) {
            signDir = path.join(cwd, 'source');
        }
    }
    catch (e) {
    }
    let defaultList = [
        {
            id: path.join(signDir, sign),
            dist: path.join(utils.getProjectRootPath(), sign),
            ACTION_TYPE: 'COPY'
        },
        {
            id: path.join(baseDir, babelConfig),
            dist: path.join(utils.getProjectRootPath(), babelConfig),
            ACTION_TYPE: 'COPY'
        }
    ];
    return defaultList;
}
function downloadSchneeUI() {
    let spinner = ora_1.default(chalk_1.default.green.bold(`正在同步最新版schnee-ui, 请稍候...\n`)).start();
    let npmDir = path.join(cwd, 'node_modules');
    process.chdir(npmDir);
    fs.removeSync(path.join(npmDir, 'schnee-ui'));
    let ret = cross_spawn_1.default.sync('git', ['clone', '-b', 'dev', 'https://github.com/qunarcorp/schnee-ui.git'], { stdio: 'inherit' });
    if (ret.error) {
        console.log(ret.error, 11);
        process.exit(1);
    }
    process.chdir(cwd);
    spinner.succeed(chalk_1.default.green.bold(`同步 schnee-ui 成功!`));
}
function getReactPath(ReactLibName) {
    return path.join(cwd, 'source', ReactLibName);
}
function getRemoteReactFile(ReactLibName) {
    return __awaiter(this, void 0, void 0, function* () {
        let dist = getReactPath(ReactLibName);
        let { data } = yield axios_1.default.get(`https://raw.githubusercontent.com/RubyLouvre/anu/branch3/dist/${ReactLibName}`);
        return [
            {
                id: dist,
                content: data,
                ACTION_TYPE: 'WRITE'
            }
        ];
    });
}
function getReactLibFile(ReactLibName) {
    let src = path.join(cliRoot, 'lib', ReactLibName);
    let dist = getReactPath(ReactLibName);
    try {
        fs.accessSync(dist);
        return [];
    }
    catch (err) {
        return [
            {
                id: src,
                dist: dist,
                ACTION_TYPE: 'COPY'
            }
        ];
    }
}
function getProjectConfigFile(buildType) {
    if (buildType === 'quick' || buildType === 'h5')
        return [];
    const map = {
        wx: 'project.config.json',
        bu: 'project.swan.json',
        ali: 'mini.project.json'
    };
    let fileName = map[buildType] || 'project.config.json';
    let src = '';
    fs.existsSync(path.join(cwd, fileName))
        ? src = path.join(cwd, fileName)
        : src = path.join(cwd, 'source', fileName);
    const dist = path.join(utils.getDistDir(), fileName);
    if (fs.existsSync(src)) {
        return [
            {
                id: src,
                dist: dist,
                ACTION_TYPE: 'COPY'
            }
        ];
    }
    else {
        return [];
    }
}
const helpers = {
    COPY: function ({ id, dist }) {
        return fs.copy(id, dist);
    },
    WRITE: function ({ id, content }) {
        fs.ensureFileSync(id);
        return fs.writeFile(id, content);
    },
    REMOVE: function ({ id }) {
        return fs.remove(id);
    }
};
function needInstallHapToolkit() {
    try {
        let hapToolKitPath = path.join(utils.getProjectRootPath(), 'node_modules', 'hap-toolkit');
        fs.accessSync(hapToolKitPath);
        return false;
    }
    catch (err) {
        return true;
    }
}
function checkPagePath(dirname) {
    if (/[\\/]common([\\/]|$)/.test(dirname))
        return;
    fs.readdir(dirname, function (err, files) {
        if (err) {
            console.log(err);
            return;
        }
        let jsFileNum = 0;
        files.forEach(file => {
            file = path.resolve(dirname, file);
            const stat = fs.statSync(file);
            if (stat.isFile()) {
                if (/\.js$/.test(file)) {
                    jsFileNum++;
                }
            }
            else {
                checkPagePath(file);
            }
            if (jsFileNum > 1) {
                console.error(chalk_1.default `{red Error: }{grey ${path.dirname(file)}} 目录不符合分包规范，该目录下不允许包含多个js文件`);
                process.exit();
            }
        });
    });
}
function injectPluginsConfig() {
    let userConfig;
    try {
        userConfig = require(path.join(cwd, 'source', `${config_1.default.buildType}Config.json`));
    }
    catch (e) {
    }
    if (userConfig && userConfig.plugins && Object.prototype.toString.call(userConfig.plugins) === '[object Object]') {
        Object.keys(userConfig.plugins).forEach(key => {
            const name = userConfig.plugins[key].name;
            if (!name) {
                delete userConfig[key];
                throw `${key}配置项必须包含name字段`;
            }
            const tagName = userConfig.plugins[key].tagName;
            config_1.default.pluginTags[name] = `plugin://${key}/${tagName ? tagName : name}`;
            delete userConfig.plugins[key].name;
            delete userConfig.plugins[key].tagName;
        });
        config_1.default.plugins = userConfig.plugins;
    }
}
function runTask({ platform: buildType, beta, betaUi, compress }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (buildType !== 'quick' && getSubpackage(buildType).length > 0) {
        }
        const ReactLibName = index_1.REACT_LIB_MAP[buildType];
        const isQuick = buildType === 'quick';
        let tasks = [];
        if (compress) {
            const compressLoaderName = 'nanachi-compress-loader';
            try {
                resolve_1.default.sync(compressLoaderName, { basedir: cwd });
            }
            catch (e) {
                let spinner = ora_1.default(chalk_1.default.green.bold(`正在安装${compressLoaderName}`)).start();
                utils.installer(compressLoaderName, '--save-dev');
                spinner.succeed(chalk_1.default.green.bold(`${compressLoaderName}安装成功`));
            }
        }
        if (betaUi) {
            downloadSchneeUI();
        }
        if (beta) {
            let spinner = ora_1.default(chalk_1.default.green.bold(`正在同步最新的${ReactLibName}, 请稍候...`)).start();
            tasks = tasks.concat(yield getRemoteReactFile(ReactLibName));
            spinner.succeed(chalk_1.default.green.bold(`同步最新的${ReactLibName}成功!`));
        }
        else {
        }
        if (isQuick) {
            tasks = tasks.concat(getQuickBuildConfigFile(), getQuickPkgFile(), getCopyFiles());
            if (needInstallHapToolkit()) {
                let toolName = 'hap-toolkit@latest';
                utils.installer(toolName, '--save-dev');
            }
        }
        injectPluginsConfig();
        tasks = tasks.concat(getProjectConfigFile(buildType));
        try {
            yield Promise.all(getRubbishFiles(buildType).map(function (task) {
                if (helpers[task.ACTION_TYPE]) {
                    return helpers[task.ACTION_TYPE](task);
                }
            }));
            yield Promise.all(tasks.map(function (task) {
                if (helpers[task.ACTION_TYPE]) {
                    return helpers[task.ACTION_TYPE](task).catch(() => { });
                }
            }));
        }
        catch (err) {
            console.log(err);
            process.exit(1);
        }
    });
}
exports.default = runTask;
