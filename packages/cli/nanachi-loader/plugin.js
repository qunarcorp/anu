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
const index_1 = require("../packages/utils/logger/index");
const config_1 = __importDefault(require("../config/config"));
const globalStore_1 = __importDefault(require("../packages/utils/globalStore"));
const setWebView = require('../packages/utils/setWebVeiw');
const cwd = process.cwd();
const id = 'NanachiWebpackPlugin';
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
        compiler.hooks.watchRun.tapAsync(id, (compilation, callback) => __awaiter(this, void 0, void 0, function* () {
            this.timer.start();
            index_1.resetNum();
            callback();
        }));
        compiler.hooks.done.tap(id, () => {
            this.timer.end();
            setWebView(compiler.NANACHI && compiler.NANACHI.webviews);
            index_1.timerLog(this.timer);
            if (config_1.default.buildType === 'quick') {
                const filePath = path_1.default.join(cwd, 'src/manifest.json');
                const originManifestJson = require(filePath);
                const newMenifest = rebuildManifest(originManifestJson, globalStore_1.default.quickPageDisplayConifg);
                fs_extra_1.default.writeFile(filePath, JSON.stringify(newMenifest, null, 4), (err) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
    }
}
exports.default = NanachiWebpackPlugin;
