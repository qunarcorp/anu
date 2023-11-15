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
const shelljs_1 = __importDefault(require("shelljs"));
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
const glob_1 = __importDefault(require("glob"));
const isMutilePack_1 = require("../../tasks/chaikaMergeTask/isMutilePack");
const config_1 = __importDefault(require("../../config/config"));
const utils_1 = __importDefault(require("../../packages/utils"));
const platforms_1 = __importDefault(require("../../consts/platforms"));
const cwd = process.cwd();
function setProjectSourceTypeList() {
    const jsonPath = path.join(cwd, `.CACHE/type${isMutilePack_1.getMultiplePackDirPrefix()}.json`);
    if (fs.existsSync(jsonPath)) {
        try {
            const json = require(jsonPath);
            config_1.default.projectSourceTypeList = json.projectSourceTypeList;
        }
        catch (err) {
            console.log(chalk_1.default.red(`[setProjectSourceTypeList] 读取 ${jsonPath} 文件失败，请联系开发者`));
            process.exit(1);
        }
    }
    const workspacePath = path.join(utils_1.default.getProjectRootPath());
    const pkgPath = path.join(workspacePath, 'package.json');
    const projectName = require(pkgPath).name;
    if (config_1.default.isSingleBundle) {
        config_1.default.projectSourceTypeList = [...config_1.default.projectSourceTypeList, {
                name: projectName,
                path: (isMultipl),
                sourceType: 'output'
            }];
    }
    else {
        config_1.default.projectSourceTypeList = [...config_1.default.projectSourceTypeList, {
                name: projectName,
                path: '',
                sourceType: 'input'
            }];
    }
}
function isInputPackage(dirPath) {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`[isInputPackage] 输入路径不存在 ${dirPath}`);
    }
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        return 'input';
    }
    else {
        return undefined;
    }
}
function isOutputPackage(dirPath) {
    if (!fs.existsSync(dirPath)) {
        throw new Error(`[isOutputPackage] 输入路径不存在 ${dirPath}`);
    }
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        return 'output';
    }
    else {
        return undefined;
    }
}
function writeProjectSourceTypeList() {
    let downloadCacheDir = path.join(cwd, '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix());
    let defaultJson = {};
    const listResult = [];
    const writePath = path.join(cwd, `.CACHE/type${isMutilePack_1.getMultiplePackDirPrefix()}.json`);
    fs.ensureFileSync(writePath);
    try {
        defaultJson = require(writePath) || {
            projectSourceTypeList: []
        };
    }
    catch (err) { }
    const dirs = fs.readdirSync(downloadCacheDir);
    dirs.forEach((dirName) => {
        const dirPath = path.join(downloadCacheDir, dirName);
        const type = isInputPackage(dirPath) || isOutputPackage(dirPath);
        if (type) {
            listResult.push({
                name: dirName,
                path: dirPath,
                sourceType: type
            });
        }
        else {
            console.log(chalk_1.default.red(`[writeProjectSourceTypeList] 出现了无法识别的类型，请联系开发者`));
            process.exit(1);
        }
    });
    defaultJson.projectSourceTypeList = listResult;
    fs.writeFileSync(writePath, JSON.stringify(defaultJson, null, 4));
    return listResult;
}
function writeVersions(moduleName, version) {
    let defaultVJson = {};
    let vPath = path.join(cwd, `.CACHE/verson${isMutilePack_1.getMultiplePackDirPrefix()}.json`);
    fs.ensureFileSync(vPath);
    try {
        defaultVJson = require(vPath) || {};
    }
    catch (err) { }
    defaultVJson[moduleName] = version;
    fs.writeFileSync(vPath, JSON.stringify(defaultVJson, null, 4));
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
            if (/\/package\.json$/.test(el)
                || /\/\.\w+$/.test(el)) {
                fs.removeSync(path.join(dist, '..', fileName));
                fs.moveSync(el, path.join(dist, '..', fileName));
            }
        });
    }
    catch (err) {
        console.log('[unPack error]:', err);
    }
}
function isOldChaikaConfig(name = "") {
    return /^[A-Za-z0-9_\.\+-]+@#?[A-Za-z0-9_\.\+-]+$/.test(name);
}
function downLoadGitRepo(target, branch) {
    let cmd = `git clone ${target} -b ${branch}`;
    let distDir = path.join(cwd, '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix());
    let gitRepoName = target.split('/').pop().replace(/\.git$/, '');
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
        nanachiUserConfig = require(path.join(utils_1.default.getProjectRootPath(), 'nanachi.config'));
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
        let data = '';
        try {
            let res = yield axios_1.default(axiosConfig);
            data = res.data;
        }
        catch (err) {
            console.log(chalk_1.default.bold.red(`${err.toString()} for ${binaryLibUrl}`));
        }
        const libDist = path.join(utils_1.default.getProjectRootPath(), `.CACHE/lib/${path.basename(patchModuleName)}`, isMutilePack_1.getMultiplePackDirPrefix());
        fs.ensureFileSync(libDist);
        fs.writeFile(libDist, data, function (err) {
            if (err) {
                console.log(err);
                return;
            }
            console.log(chalk_1.default.green(`安装依赖包 ${binaryLibUrl} 成功.`));
            const unPackDist = path.join(utils_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix(), patchModuleName);
            unPack(libDist, unPackDist);
        });
        writeVersions(patchModuleName, binaryLibUrl.split('/').pop());
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
        if (Object.keys(nanachiChaikaConfig).length
            && nanachiChaikaConfig.onInstallTarball
            && typeof nanachiChaikaConfig.onInstallTarball === 'function') {
            let gitRepo = nanachiChaikaConfig.onInstallTarball(key, depModules[key]);
            downLoadGitRepo(gitRepo, depModules[key]);
        }
        else if (isOldChaikaConfig(`${key}@${depModules[key]}`)) {
            const ret = require(path.join(utils_1.default.getProjectRootPath(), 'node_modules', '@qnpm/chaika-patch/mutiInstall'))(`${key}@${depModules[key]}`);
            if (ret.type === 'git') {
                downLoadGitRepo(ret.gitRepo, ret.branchName);
            }
            else {
                downLoadBinaryLib(ret.patchModuleUrl, ret.patchModuleName);
            }
        }
        else {
        }
    });
}
function default_1(name, opts) {
    if (opts.platform && platforms_1.default.some((v) => v.buildType === opts.platform)) {
        config_1.default.buildType = opts.platform;
    }
    console.log(chalk_1.default.bold.yellow(`传入的平台参数：${opts.platform}，处理后的平台参数：${config_1.default.buildType}`));
    if (process.env.NANACHI_CHAIK_MODE != 'CHAIK_MODE') {
        console.log(chalk_1.default.bold.red('需在package.json中配置{"nanachi": {"chaika": true }}, 拆库开发功能请查阅文档: https://rubylouvre.github.io/nanachi/documents/chaika.html'));
        process.exit(1);
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
        const ret = require(path.join(utils_1.default.getProjectRootPath(), 'node_modules', '@qnpm/chaika-patch/mutiInstall'))(name);
        if (ret.type === 'git') {
            downLoadGitRepo(ret.gitRepo, ret.branchName);
        }
        else {
            downLoadBinaryLib(ret.patchModuleUrl, ret.patchModuleName);
        }
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
    console.log(type);
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
;
