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
Object.defineProperty(exports, "__esModule", { value: true });
const timer_1 = __importDefault(require("../packages/utils/timer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const index_1 = require("../packages/utils/logger/index");
const lintQueue_1 = __importDefault(require("../packages/utils/lintQueue"));
const config_1 = __importDefault(require("../config/config"));
const utils_1 = __importDefault(require("../packages/utils"));
const globalStore_1 = __importDefault(require("../packages/utils/globalStore"));
const publicPkg_1 = require("../packages/utils/publicPkg");
const setWebView = require('../packages/utils/setWebVeiw');
const cwd = process.cwd();
const id = 'NanachiWebpackPlugin';
function getNanachiConfig() {
    try {
        return require(path_1.default.join(cwd, 'nanachi.config.js'));
    }
    catch (err) {
        return {};
    }
}
const nanachiUserConfig = getNanachiConfig();
function callAfterCompileOnce() {
    let afterComileOneceLock = false;
    return function (nanachiUserConfig) {
        if (afterComileOneceLock)
            return;
        typeof nanachiUserConfig.afterCompileOnce === 'function' && nanachiUserConfig.afterCompileOnce();
        afterComileOneceLock = true;
    };
}
function beforeCompileOnce() {
    let beforeCompileOnceLock = false;
    return function (nanachiUserConfig) {
        if (beforeCompileOnceLock)
            return;
        typeof nanachiUserConfig.beforeCompileOnce === 'function' && nanachiUserConfig.beforeCompileOnce();
        beforeCompileOnceLock = true;
    };
}
const callAfterCompileOnceFn = callAfterCompileOnce();
const callBeforeCompileOnceFn = beforeCompileOnce();
function callAfterCompileFn(nanachiUserConfig) {
    typeof nanachiUserConfig.afterCompile === 'function' && nanachiUserConfig.afterCompile();
}
function callBeforeCompileFn(nanachiUserConfig) {
    typeof nanachiUserConfig.beforeCompile === 'function' && nanachiUserConfig.beforeCompile();
}
function rebuildManifest(manifestJson, quickPageDisplayConifg) {
    const allPages = manifestJson.router.pages;
    const parentDisplay = manifestJson.display || {};
    const displayRoutes = Object.keys(quickPageDisplayConifg);
    displayRoutes.forEach(route => {
        const routeLevel = route.split('/');
        const matchKey = routeLevel.slice(0, routeLevel.length - 1).join('/');
        if (allPages[matchKey]) {
            parentDisplay.pages = parentDisplay.pages || {};
            parentDisplay.pages[matchKey] = quickPageDisplayConifg[route];
        }
    });
    return manifestJson;
}
function writeInternalCommonRuntime() {
    const code = `
    export function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }
    
    export function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }
    
    export function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    
    export function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
    
    export function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
    `.trim();
    const writeDistFilePath = path_1.default.join(utils_1.default.getDistDir(), 'internal/runtimecommon.js');
    fs_extra_1.default.ensureFileSync(writeDistFilePath);
    fs_extra_1.default.writeFileSync(writeDistFilePath, code);
}
function setDepInMain(dependencies) {
    dependencies === null || dependencies === void 0 ? void 0 : dependencies.forEach((dep) => {
        var _a;
        publicPkg_1.publicPkgComponentReference[dep].putMain = true;
        setDepInMain((_a = publicPkg_1.publicPkgComponentReference[dep]) === null || _a === void 0 ? void 0 : _a.dependencies);
    });
}
function filterPublicPkgReference(publicPkgReference) {
    const { putMainInMultiSubPkgUse = [], multiPkglimit = 3 } = config_1.default.syncPlatformConfig;
    let movePublicFile = Object.keys(publicPkgReference).filter(publicFile => {
        const { subpkgUse, dependencies, name, putMain } = publicPkgReference[publicFile];
        if (putMain) {
            return false;
        }
        let exsitMain = Object.keys(subpkgUse).some(v => v === 'MAIN');
        if (exsitMain) {
            setDepInMain(dependencies);
            return false;
        }
        exsitMain = putMainInMultiSubPkgUse.some(v => {
            const re = new RegExp(v);
            return re.test(publicFile);
        });
        if (exsitMain) {
            setDepInMain(dependencies);
            return false;
        }
        const newSubpkgUse = Object.assign({}, subpkgUse);
        delete newSubpkgUse[publicPkg_1.ASYNC_FILE_NAME];
        const referencePkgNum = Object.keys(newSubpkgUse).length;
        return referencePkgNum < multiPkglimit;
    });
    movePublicFile = movePublicFile.filter(v => !publicPkgReference[v].putMain);
    return movePublicFile;
}
let deleteAssete = [];
function copyAsset(params) {
    const { compilation, publicFile, subResource, type } = params;
    Object.keys(compilation.assets).forEach(asset => {
        if (asset.startsWith(`${publicFile}.`)) {
            compilation.assets[subResource + '/' + asset] = compilation.assets[asset];
            deleteAssete.push(asset);
            if (path_1.default.extname(asset) === '.js') {
                changeReferPathAfterCopy(compilation, asset, subResource + '/' + asset, type);
            }
        }
    });
}
function changeReferComponentPath(params, isFirst) {
    const { compilation, publicFile, subResource, filePath } = params;
    const { subpkgUse, dependencies, name } = publicPkg_1.publicPkgComponentReference[publicFile];
    if (isFirst) {
        subpkgUse[subResource].forEach((j) => {
            const codeString = compilation.assets[j]._value;
            let code = JSON.parse(codeString);
            code.usingComponents[name] = `${subResource}/${publicFile}.json`;
            compilation.assets[j]._value = JSON.stringify(code);
        });
    }
    else {
        const fullFilePath = filePath + '.json';
        const codeString = compilation.assets[fullFilePath]._value;
        let code = JSON.parse(codeString);
        code.usingComponents[name] = `${subResource}/${publicFile}.json`;
        compilation.assets[fullFilePath]._value = JSON.stringify(code);
    }
}
function changeReferCommonPath(params, isFirst) {
    const { compilation, publicFile, subResource, filePath } = params;
    const { subpkgUse, dependencies, name } = publicPkg_1.publicPkgCommonReference[publicFile];
    const newPath = `${subResource}/${publicFile}.js`;
    if (isFirst) {
        subpkgUse[subResource].forEach((j) => {
            const fullFilePath = j + '.js';
            const releatePath = utils_1.default.getRelativePath(fullFilePath, newPath);
            let codeString = compilation.assets[fullFilePath]._value;
            codeString = codeString.replace(name, releatePath);
            compilation.assets[fullFilePath]._value = codeString;
        });
    }
    else {
        const fullFilePath = filePath + '.js';
        const releatePath = utils_1.default.getRelativePath(fullFilePath, newPath);
        let codeString = compilation.assets[fullFilePath]._value;
        codeString = codeString.replace(name, releatePath);
        compilation.assets[fullFilePath]._value = codeString;
    }
}
function visitDependency(params) {
    const { compilation, publicPkgReference, publicFile, subResource, filePath, type } = params;
    const { subpkgUse, dependencies, name } = publicPkgReference[publicFile];
    dependencies.forEach((dep) => {
        Object.keys(publicPkgReference[dep].subpkgUse).forEach((subpkg) => {
            if (subpkg === publicPkg_1.ASYNC_FILE_NAME) {
                migrate({
                    compilation,
                    publicFile: dep,
                    subResource,
                    filePath,
                    type
                }, false);
            }
        });
        const innerDependencies = publicPkgReference[dep].dependencies;
        if (innerDependencies) {
            visitDependency({
                compilation,
                publicPkgReference,
                publicFile: dep,
                subResource,
                filePath: `${subResource}/${dep}`,
                type,
            });
        }
    });
}
;
function migrate(params, isFirst) {
    copyAsset(params);
    if (params.type === publicPkg_1.ReferenceType.COMPONENTS) {
        changeReferComponentPath(params, isFirst);
    }
    else {
        changeReferCommonPath(params, isFirst);
    }
    ;
}
function changeReferPathAfterCopy(compilation, oldPath, newPath) {
    console.log(`------------------------------`);
    console.log(`oldPath: ${oldPath};newPath: ${newPath}`);
    const sourceDir = path_1.default.dirname(oldPath);
    const targetDir = path_1.default.dirname(newPath);
    const data = compilation.assets[newPath]._value;
    const modifiedData = data.replace(/(require\(['"])(\..*?)(['"]\))|(\bfrom\s+['"])(\..*?)(['"])/g, function (match, p1, p2, p3, p4, p5, p6) {
        const referAbsolutePath = path_1.default.resolve(sourceDir, p2 || p5);
        const referPath = path_1.default.relative(cwd, referAbsolutePath);
        let relativePath;
        if (publicPkg_1.publicPkgCommonReference[referPath]) {
            console.log('不更改:', referPath);
            relativePath = p2 || p5;
        }
        else {
            relativePath = path_1.default.relative(targetDir, referPath);
        }
        if (p2) {
            return p1 + relativePath + p3;
        }
        else {
            return p4 + relativePath + p6;
        }
    });
    compilation.assets[newPath]._value = modifiedData;
}
function migrateStrategy(compilation, movePublicFile, publicPkgReference, type) {
    movePublicFile.forEach((publicFile) => {
        const { subpkgUse, dependencies, name } = publicPkgReference[publicFile];
        Object.keys(subpkgUse).forEach((subpkg) => {
            if (subpkg !== publicPkg_1.ASYNC_FILE_NAME) {
                subpkgUse[subpkg].forEach((path) => {
                    migrate({
                        compilation,
                        publicFile,
                        subResource: subpkg,
                        filePath: path,
                        type
                    }, true);
                });
                if (dependencies) {
                    visitDependency({
                        compilation,
                        publicPkgReference,
                        publicFile,
                        subResource: subpkg,
                        filePath: `${subpkg}/${publicFile}`,
                        type,
                    });
                }
            }
        });
    });
    deleteAssete.forEach(asset => {
        delete compilation.assets[asset];
    });
}
function managePublicPkgComponentReference(compilation) {
    const movePublicFile = filterPublicPkgReference(publicPkg_1.publicPkgComponentReference);
    migrateStrategy(compilation, movePublicFile, publicPkg_1.publicPkgComponentReference, publicPkg_1.ReferenceType.COMPONENTS);
}
function managePublicPkgCommonReference(compilation) {
    const movePublicFile = filterPublicPkgReference(publicPkg_1.publicPkgCommonReference);
    migrateStrategy(compilation, movePublicFile, publicPkg_1.publicPkgCommonReference, publicPkg_1.ReferenceType.COMMON);
}
class NanachiWebpackPlugin {
    constructor({ platform = 'wx', compress = false, beta = false, betaUi = false } = {}) {
        this.timer = new timer_1.default();
        this.nanachiOptions = {
            platform,
            compress,
            beta,
            betaUi
        };
    }
    apply(compiler) {
        compiler.hooks.compilation.tap(id, (compilation) => {
            compilation.hooks.normalModuleLoader.tap(id, (loaderContext) => {
                loaderContext.nanachiOptions = this.nanachiOptions;
            });
        });
        compiler.hooks.emit.tap(id, (compilation) => {
            const reg = new RegExp(compiler.options.output.filename + "");
            Object.keys(compilation.assets).forEach(key => {
                if (reg.test(key)) {
                    delete compilation.assets[key];
                }
            });
            if (!config_1.default.publicPkg || config_1.default.requireAsync) {
                return;
            }
            managePublicPkgComponentReference(compilation);
            managePublicPkgCommonReference(compilation);
            debugger;
        });
        compiler.hooks.run.tapAsync(id, (compilation, callback) => __awaiter(this, void 0, void 0, function* () {
            this.timer.start();
            index_1.resetNum();
            callback();
        }));
        compiler.hooks.beforeCompile.tapAsync(id, (compilation, callback) => __awaiter(this, void 0, void 0, function* () {
            if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
                writeInternalCommonRuntime();
            }
            callBeforeCompileFn(nanachiUserConfig);
            callBeforeCompileOnceFn(nanachiUserConfig);
            callback();
        }));
        compiler.hooks.watchRun.tapAsync(id, (compilation, callback) => __awaiter(this, void 0, void 0, function* () {
            this.timer.start();
            index_1.resetNum();
            callback();
        }));
        compiler.hooks.done.tap(id, () => {
            this.timer.end();
            setWebView(compiler.NANACHI && compiler.NANACHI.webviews);
            if (config_1.default.buildType === 'quick') {
                const filePath = path_1.default.join(cwd, '../../../', 'src/manifest.json');
                const originManifestJson = require(filePath);
                const newMenifest = rebuildManifest(originManifestJson, globalStore_1.default.quickPageDisplayConifg);
                fs_extra_1.default.writeFile(filePath, JSON.stringify(newMenifest, null, 4), (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
            while (lintQueue_1.default.length) {
                const log = lintQueue_1.default.shift();
                if (log.level === 'warn') {
                    console.log(chalk_1.default.yellow(`[warn] ${log.msg}`));
                }
                if (log.level === 'error') {
                    console.log(chalk_1.default.red(`[error] ${log.msg}`));
                }
            }
            callAfterCompileFn(nanachiUserConfig);
            callAfterCompileOnceFn(nanachiUserConfig);
        });
    }
}
exports.default = NanachiWebpackPlugin;
