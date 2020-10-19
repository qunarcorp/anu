"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
Object.defineProperty(exports, "__esModule", { value: true });
const shelljs_1 = __importDefault(require("shelljs"));
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
const glob_1 = __importDefault(require("glob"));
const inquirer_1 = __importDefault(require("inquirer"));
const cwd = process.cwd();
function writeVersions(moduleName, version) {
    let defaultVJson = {};
    let vPath = path.join(cwd, '.CACHE/verson.json');
    fs.ensureFileSync(vPath);
    try {
        defaultVJson = require(vPath) || {};
    }
    catch (err) { }
    defaultVJson[moduleName] = version;
    fs.writeFile(vPath, JSON.stringify(defaultVJson, null, 4), err => {
        if (err) {
            console.log(err);
        }
    });
}
function unPack(src, dist) {
    dist = path.join(dist, 'source');
    fs.ensureDirSync(dist);
    fs.emptyDirSync(dist);
    const unzipExec = shelljs_1.default.exec(`tar -zxvf ${src} -C ${dist}`, {
        silent: true
    });
    if (unzipExec.code) {
        console.log(chalk_1.default.bold.red(unzipExec.stderr));
    }
    try {
        let files = glob_1.default.sync(dist + '/**', { nodir: true, dot: true });
        files.forEach(function (el) {
            let fileName = path.basename(el);
            if (/\/package\.json$/.test(el) || /\/\.\w+$/.test(el)) {
                fs.removeSync(path.join(dist, '..', fileName));
                fs.moveSync(el, path.join(dist, '..', fileName));
            }
        });
    }
    catch (err) {
    }
}
function isOldChaikaConfig(name = '') {
    return /^[A-Za-z0-9_\.\+-]+@#?[A-Za-z0-9_\.\+-]+$/.test(name);
}
function downLoadGitRepo(target, branch) {
    let cmd = `git clone ${target} -b ${branch}`;
    let distDir = path.join(cwd, '.CACHE', 'download');
    let gitRepoName = target
        .split('/')
        .pop()
        .replace(/\.git$/, '');
    fs.removeSync(path.join(distDir, gitRepoName));
    fs.ensureDirSync(distDir);
    let std = shelljs_1.default.exec(cmd, {
        cwd: distDir,
        silent: true
    });
    if (/fatal:/.test(std.stderr)) {
        console.log(chalk_1.default.bold.red(std.stderr));
        process.exit(1);
    }
    writeVersions(gitRepoName, branch);
    console.log(chalk_1.default.green(`安装依赖包 ${target} 成功. VERSION: ${branch}`));
}
function getNanachiChaikaConfig() {
    let nanachiUserConfig = {};
    try {
        nanachiUserConfig = require(path.join(cwd, 'nanachi.config'));
    }
    catch (err) {
        if (/SyntaxError/.test(err)) {
            console.log(err);
        }
    }
    return nanachiUserConfig.chaikaConfig || {};
}
function downLoadBinaryLib(binaryLibUrl, patchModuleName) {
    return __awaiter(this, void 0, void 0, function* () {
        let axiosConfig = {
            url: binaryLibUrl,
            type: 'GET',
            responseType: 'arraybuffer'
        };
        try {
            let res = yield axios_1.default(axiosConfig);
            let libDist = path.join(cwd, `.CACHE/lib/${path.basename(patchModuleName)}`);
            fs.ensureFileSync(libDist);
            fs.writeFile(libDist, res.data, function (err) {
                if (err)
                    return console.log(err);
                console.log(chalk_1.default.green(`安装依赖包 ${binaryLibUrl} 成功.`));
                unPack(libDist, path.join(cwd, `.CACHE/download/${patchModuleName}`));
            });
            writeVersions(patchModuleName, binaryLibUrl.split('/').pop());
        }
        catch (err) {
            console.log(chalk_1.default.bold.red(`${err.toString()} for ${binaryLibUrl}`));
        }
    });
}
function downLoadPkgDepModule() {
    var pkg = require(path.join(cwd, 'package.json'));
    var depModules = pkg.modules || {};
    let depKey = Object.keys(depModules);
    const nanachiChaikaConfig = getNanachiChaikaConfig();
    if (!depKey.length) {
        console.log(chalk_1.default.bold.red('未在package.json中发现拆库依赖包, 全量安装失败.'));
        process.exit(1);
    }
    depKey.forEach(function (key) {
        if (Object.keys(nanachiChaikaConfig).length &&
            nanachiChaikaConfig.onInstallTarball &&
            typeof nanachiChaikaConfig.onInstallTarball === 'function') {
            let gitRepo = nanachiChaikaConfig.onInstallTarball(key, depModules[key]);
            downLoadGitRepo(gitRepo, depModules[key]);
        }
        else if (isOldChaikaConfig(`${key}@${depModules[key]}`)) {
            const patchOldChaikaDownLoad = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
            patchOldChaikaDownLoad(`${key}@${depModules[key]}`, downLoadGitRepo, downLoadBinaryLib);
        }
        else {
        }
    });
}
function handleRemote(opts) {
    const remote = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch/remote'));
    remote.getBizModule(opts, (historyInfos) => __awaiter(this, void 0, void 0, function* () {
        const depModules = [
            {
                app_code: 'nnc_home_qunar',
                version: historyInfos.integrate_branch,
                gitInstall: true,
                moduleName: 'nnc_home_qunar'
            }
        ];
        const pkg = require(path.join(process.cwd(), 'package.json'));
        const skipModules = [pkg.name];
        const modules = []
            .concat(historyInfos.modules, depModules)
            .filter(c => !skipModules.includes(c.moduleName));
        const depModuleNames = [];
        const moduleNames = modules.map(({ app_code, version, gitInstall, moduleName }) => {
            const gitDivide = gitInstall ? '#' : '';
            const ss = `${app_code.replace(/^nnc_(module_)?/, '')}@${gitDivide}${version}`;
            if (['nnc_home_qunar', 'nnc_module_qunar_platform'].includes(moduleName)) {
                depModuleNames.push(ss);
                return {
                    name: moduleName,
                    value: ss,
                    disabled: '依赖项'
                };
            }
            return ss;
        });
        const answers = yield inquirer_1.default
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
        willInstallModules.forEach((name) => {
            const patchOldChaikaDownLoad = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
            patchOldChaikaDownLoad(name, downLoadGitRepo, downLoadBinaryLib);
        });
    }));
}
function default_1(name, opts) {
    if (process.env.NANACHI_CHAIK_MODE != 'CHAIK_MODE') {
        console.log(chalk_1.default.bold.red('需在package.json中配置{"nanachi": {"chaika": true }}, 拆库开发功能请查阅文档: https://qunarcorp.github.io/anu/documents/chaika.html'));
        process.exit(1);
    }
    if (opts.remote) {
        handleRemote(opts);
        return;
    }
    let downloadInfo = {
        type: '',
        lib: ''
    };
    if (!name && !opts.branch) {
        downloadInfo = {
            type: 'all',
            lib: ''
        };
    }
    if (isOldChaikaConfig(name)) {
        const patchOldChaikaDownLoad = require(path.join(cwd, 'node_modules', '@qnpm/chaika-patch'));
        patchOldChaikaDownLoad(name, downLoadGitRepo, downLoadBinaryLib);
        return;
    }
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
        case 'all':
            downLoadPkgDepModule();
        default:
            break;
    }
}
exports.default = default_1;
