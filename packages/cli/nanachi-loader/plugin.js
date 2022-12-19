"use strict";
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
            if (Object.isFrozen(compilation.hooks)) {
                const NormalModule = compiler.webpack.NormalModule;
                NormalModule.getCompilationHooks(compilation).loader.tap(id, (loaderContext) => {
                    loaderContext.nanachiOptions = this.nanachiOptions;
                });
            }
            else {
                compilation.hooks.normalModuleLoader.tap(id, (loaderContext) => {
                    loaderContext.nanachiOptions = this.nanachiOptions;
                });
            }
        });
        if (global.useWebpackFuture) {
            compiler.hooks.compilation.tap(id, (compilation) => {
                const reg = new RegExp(compiler.options.output.filename + "");
                compilation.hooks.processAssets.tap({
                    name: id,
                    stage: compilation.PROCESS_ASSETS_STAGE_ANALYSE,
                }, (assets) => {
                    Object.keys(assets).forEach(key => {
                        if (reg.test(key)) {
                            delete assets[key];
                        }
                    });
                });
            });
        }
        else {
            compiler.hooks.emit.tap(id, (compilation) => {
                const reg = new RegExp(compiler.options.output.filename + "");
                Object.keys(compilation.assets).forEach(key => {
                    if (reg.test(key)) {
                        delete compilation.assets[key];
                    }
                });
            });
        }
        compiler.hooks.run.tapAsync(id, (compilation, callback) => {
            this.timer.start();
            index_1.resetNum();
            callback();
        });
        compiler.hooks.beforeCompile.tapAsync(id, (compilation, callback) => {
            if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
                writeInternalCommonRuntime();
            }
            callBeforeCompileFn(nanachiUserConfig);
            callBeforeCompileOnceFn(nanachiUserConfig);
            callback();
        });
        compiler.hooks.watchRun.tapAsync(id, (compilation, callback) => {
            this.timer.start();
            index_1.resetNum();
            callback();
        });
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
