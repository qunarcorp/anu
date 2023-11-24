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
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(this, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

export {
    ownKeys,_objectSpread,_defineProperty,_toPropertyKey,_toPrimitive,asyncGeneratorStep,_asyncToGenerator
}
`;
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
