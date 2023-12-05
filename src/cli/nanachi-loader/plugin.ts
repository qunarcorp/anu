import Timer from '../packages/utils/timer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { resetNum, timerLog } from '../packages/utils/logger/index';
import lintQueue from '../packages/utils/lintQueue';
import config from '../config/config';
import utils from '../packages/utils';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { NanachiOptions } from '../index';
import globalStore from '../packages/utils/globalStore';
import webpack from 'webpack';
const setWebView = require('../packages/utils/setWebVeiw');
const cwd = process.cwd();
const id = 'NanachiWebpackPlugin';

// const pageConfig = require('../packages/h5Helpers/pageConfig');

function getNanachiConfig(){
    try {
        return require(path.join(cwd, 'nanachi.config.js'));
    } catch (err) {
        return {};
    }
}

interface NanachiCompiler extends webpack.Compiler {
    NANACHI?: {
        webviews?: Array<any>
    }
}

// beforeCompile, afterCompile, beforeCompileOnce, afterCompileOnce
const nanachiUserConfig = getNanachiConfig();

function callAfterCompileOnce() {
    let afterComileOneceLock = false;
    return function(nanachiUserConfig:any) {
        if (afterComileOneceLock) return;
        typeof nanachiUserConfig.afterCompileOnce === 'function' && nanachiUserConfig.afterCompileOnce();
        afterComileOneceLock = true;
    }
}

function beforeCompileOnce() {
    let beforeCompileOnceLock = false;
    return function(nanachiUserConfig:any) {
        if (beforeCompileOnceLock) return;
        typeof nanachiUserConfig.beforeCompileOnce === 'function' && nanachiUserConfig.beforeCompileOnce();
        beforeCompileOnceLock = true;
    }
}

const callAfterCompileOnceFn = callAfterCompileOnce();
const callBeforeCompileOnceFn = beforeCompileOnce();

function callAfterCompileFn(nanachiUserConfig:any) {
    typeof nanachiUserConfig.afterCompile === 'function' && nanachiUserConfig.afterCompile();
}

function callBeforeCompileFn(nanachiUserConfig:any) {
    typeof nanachiUserConfig.beforeCompile === 'function' && nanachiUserConfig.beforeCompile();
}


// https://doc.quickapp.cn/framework/manifest.html
function rebuildManifest(manifestJson:object, quickPageDisplayConifg:object) {
    // @ts-ignore
    const allPages = manifestJson.router.pages;
    const parentDisplay = manifestJson.display || {};
    const displayRoutes = Object.keys(quickPageDisplayConifg);
    displayRoutes.forEach(route => {
        const routeLevel = route.split('/');
        const matchKey = routeLevel.slice(0, routeLevel.length -1).join('/');
        // 确认当前路由有效
        if (allPages[matchKey]) {
           parentDisplay.pages = parentDisplay.pages || {};
           // @ts-ignore
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

    const writeDistFilePath = path.join(utils.getDistDir(), 'internal/runtimecommon.js');

    fs.ensureFileSync(writeDistFilePath);
    fs.writeFileSync(writeDistFilePath, code);

}

class NanachiWebpackPlugin implements webpack.Plugin {
    private timer: Timer;
    private nanachiOptions: NanachiOptions;
    constructor({
        platform = 'wx',
        compress = false,
        beta = false,
        betaUi = false
    }: NanachiOptions = {}) {
        this.timer = new Timer();
        this.nanachiOptions = {
            platform,
            compress,
            beta,
            betaUi
        };
    }
    apply(compiler: NanachiCompiler) {

        // 为各种 loader 挂载 nanachiOptions
        compiler.hooks.compilation.tap(id, (compilation) => {
            compilation.hooks.normalModuleLoader.tap(id, (loaderContext) => {
                loaderContext.nanachiOptions = this.nanachiOptions;
            });
        });

        // 删除webpack打包产物
        compiler.hooks.emit.tap(id, (compilation) => {
            // if (this.nanachiOptions.platform === 'h5') {
            //     // 生成pageConfig 文件 用于动态加载情况下，读取页面配置信息
            //     const { code } = generate(t.exportDefaultDeclaration(pageConfig));
            //     compilation.assets['pageConfig.js'] = {
            //         source: function() {
            //             return code;
            //         },
            //         size: function() {
            //             return code.length;
            //         }
            //     };
            // }
            const reg = new RegExp(compiler.options.output.filename+"");
            Object.keys(compilation.assets).forEach(key => {
                if (reg.test(key)) {
                    delete compilation.assets[key];
                }
            });
        });

        compiler.hooks.run.tapAsync(id, async (compilation, callback) => {
            this.timer.start();
            resetNum();
            callback();
        });

        compiler.hooks.beforeCompile.tapAsync(id, async (compilation, callback) => {
            // 这么做是因为服务于缓存编译
            if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
                writeInternalCommonRuntime();
            }
            callBeforeCompileFn(nanachiUserConfig);
            callBeforeCompileOnceFn(nanachiUserConfig);
            callback();
        });

        compiler.hooks.watchRun.tapAsync(id, async (compilation, callback) => {
            this.timer.start();
            resetNum();
            callback();
        });

        compiler.hooks.done.tap(id, () => {
            this.timer.end();
            setWebView(compiler.NANACHI && compiler.NANACHI.webviews);
            // timerLog(this.timer);
            if (config.buildType === 'quick') {
                const filePath = path.join(cwd, '../../../', 'src/manifest.json');
                const originManifestJson = require(filePath);
                const newMenifest =  rebuildManifest(originManifestJson, globalStore.quickPageDisplayConifg)
                fs.writeFile(filePath, JSON.stringify(newMenifest, null, 4), (err) => {
                    if (err) {
                        throw err;
                    }
                })
            }

            while (lintQueue.length) {
                const log = lintQueue.shift();
                if (log.level === 'warn') {
                    console.log(chalk.yellow(`[warn] ${log.msg}`));
                }
                if (log.level === 'error') {
                    console.log(chalk.red(`[error] ${log.msg}`));
                }
            }

            callAfterCompileFn(nanachiUserConfig);
            callAfterCompileOnceFn(nanachiUserConfig);

        });

    }
}

export default NanachiWebpackPlugin;
