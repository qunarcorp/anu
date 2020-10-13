import Timer from '../packages/utils/timer';
import fs from 'fs-extra';
import path from 'path';
import { resetNum, timerLog } from '../packages/utils/logger/index';
import config from '../config/config';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { NanachiOptions } from '../index';
import globalStore from '../packages/utils/globalStore';
import webpack = require('webpack');
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
            timerLog(this.timer);
            if (config.buildType === 'quick') {
                const filePath = path.join(cwd, 'src/manifest.json');
                const originManifestJson = require(filePath);
                const newMenifest =  rebuildManifest(originManifestJson, globalStore.quickPageDisplayConifg)
                fs.writeFile(filePath, JSON.stringify(newMenifest, null, 4), (err) => {
                    if (err) {
                        throw err;
                    }
                })
            }

            callAfterCompileFn(nanachiUserConfig);
            callAfterCompileOnceFn(nanachiUserConfig);

        });
     
    }
}

export default NanachiWebpackPlugin;