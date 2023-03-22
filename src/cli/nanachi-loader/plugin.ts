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
import webpack = require('webpack');
import { ReferenceType, ASYNC_FILE_NAME, PublicPkgReference, publicPkgComponentReference, publicPkgCommonReference } from '../packages/utils/publicPkg';

const setWebView = require('../packages/utils/setWebVeiw');
const cwd = process.cwd();
const id = 'NanachiWebpackPlugin';
// const pageConfig = require('../packages/h5Helpers/pageConfig');

function getNanachiConfig() {
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
    return function (nanachiUserConfig: any) {
        if (afterComileOneceLock) return;
        typeof nanachiUserConfig.afterCompileOnce === 'function' && nanachiUserConfig.afterCompileOnce();
        afterComileOneceLock = true;
    }
}

function beforeCompileOnce() {
    let beforeCompileOnceLock = false;
    return function (nanachiUserConfig: any) {
        if (beforeCompileOnceLock) return;
        typeof nanachiUserConfig.beforeCompileOnce === 'function' && nanachiUserConfig.beforeCompileOnce();
        beforeCompileOnceLock = true;
    }
}

const callAfterCompileOnceFn = callAfterCompileOnce();
const callBeforeCompileOnceFn = beforeCompileOnce();

function callAfterCompileFn(nanachiUserConfig: any) {
    typeof nanachiUserConfig.afterCompile === 'function' && nanachiUserConfig.afterCompile();
}

function callBeforeCompileFn(nanachiUserConfig: any) {
    typeof nanachiUserConfig.beforeCompile === 'function' && nanachiUserConfig.beforeCompile();
}


// https://doc.quickapp.cn/framework/manifest.html
function rebuildManifest(manifestJson: object, quickPageDisplayConifg: object) {
    // @ts-ignore
    const allPages = manifestJson.router.pages;
    const parentDisplay = manifestJson.display || {};
    const displayRoutes = Object.keys(quickPageDisplayConifg);
    displayRoutes.forEach(route => {
        const routeLevel = route.split('/');
        const matchKey = routeLevel.slice(0, routeLevel.length - 1).join('/');
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

function setDepInMain(publicPkgReference: PublicPkgReference, dependencies: string[]) {
    dependencies?.forEach((dep: string) => {
        publicPkgReference[dep].putMain = true;
        setDepInMain(publicPkgReference, publicPkgReference[dep]?.dependencies);
    });
}

function filterPublicPkgReference(publicPkgReference: PublicPkgReference) {

    const { putMainInMultiSubPkgUse = [], multiPkglimit = 3 } = config.syncPlatformConfig;
    let movePublicFile = Object.keys(publicPkgReference).filter(publicFile => {
        const { subpkgUse, dependencies, name, putMain } = publicPkgReference[publicFile];
        if (putMain) {
            return false;
        }

        let exsitMain = Object.keys(subpkgUse).some(v => v === 'MAIN');
        if (exsitMain) {
            setDepInMain(publicPkgReference, dependencies);
            return false;
        }

        exsitMain = putMainInMultiSubPkgUse.some(v => {
            const re = new RegExp(v);
            return re.test(publicFile);
        });
        if (exsitMain) {
            setDepInMain(publicPkgReference, dependencies);
            return false;
        }

        // 去除分包的计算分包数
        const newSubpkgUse = Object.assign({}, subpkgUse);
        delete newSubpkgUse[ASYNC_FILE_NAME]
        const referencePkgNum = Object.keys(newSubpkgUse).length;
        return referencePkgNum < multiPkglimit;
    });

    /**
     * 再次过滤，考虑到以下情况D放置主包的情况，但是B先过滤
     * A-B
     * D-B
     */
    movePublicFile = movePublicFile.filter(v => !publicPkgReference[v].putMain);

    return movePublicFile;
}

interface VisitDependencyParams {
    compilation: webpack.compilation.Compilation,
    publicPkgReference?: PublicPkgReference,
    publicFile: string,// 公共文件
    subResource: string,// 更改的文件所在分包
    filePath: string,// 更改的文件路径
    type: ReferenceType
}

let deleteAssete: string[] = [];

/**
 * 拷贝文件
 * @param params 
 */
function copyAsset(params: VisitDependencyParams) {
    const { compilation, publicFile, subResource, type } = params;
    Object.keys(compilation.assets).forEach(asset => {
        if (asset.startsWith(`${publicFile}.`)) {
            compilation.assets[subResource + '/' + asset] = compilation.assets[asset];
            deleteAssete.push(asset);

            if (path.extname(asset) === '.js') {
                // 更改自身引用其他文件的路径
                changeReferPathAfterCopy(compilation, asset, subResource + '/' + asset, type);
            }
        }
    });
}

/**
 * 更改json文件引用路径
 * @param params 
 * @param isFirst 
 */
function changeReferComponentPath(params: VisitDependencyParams, isFirst: boolean) {
    const { compilation, publicFile, subResource, filePath } = params;
    const { subpkgUse, dependencies, name } = publicPkgComponentReference[publicFile];
    if (isFirst) {
        subpkgUse[subResource].forEach((j: string) => {
            const codeString = compilation.assets[j]._value;
            let code = JSON.parse(codeString);
            code.usingComponents[name] = `${subResource}/${publicFile}.json`;
            compilation.assets[j]._value = JSON.stringify(code);
        });
    } else {
        const fullFilePath = filePath + '.json';
        const codeString = compilation.assets[fullFilePath]._value;
        let code = JSON.parse(codeString);
        code.usingComponents[name] = `${subResource}/${publicFile}.json`;
        compilation.assets[fullFilePath]._value = JSON.stringify(code);
    }
}


/**
 * 更改引用js的路径
 * @param params 
 * @param isFirst 
 */
function changeReferCommonPath(params: VisitDependencyParams, isFirst: boolean) {
    const { compilation, publicFile, subResource, filePath } = params;

    const { subpkgUse, dependencies, name } = publicPkgCommonReference[publicFile];

    const newPath = `${subResource}/${publicFile}.js`

    if (isFirst) {
        subpkgUse[subResource].forEach((j: string) => {
            const fullFilePath = j + '.js';
            const releatePath = utils.getRelativePath(fullFilePath, newPath);
            let codeString = compilation.assets[fullFilePath]._value;
            codeString = codeString.replace(name, releatePath)
            compilation.assets[fullFilePath]._value = codeString;
        });
    } else {
        const fullFilePath = filePath + '.js';
        const releatePath = utils.getRelativePath(fullFilePath, newPath);
        let codeString = compilation.assets[fullFilePath]._value;
        codeString = codeString.replace(name, releatePath)
        compilation.assets[fullFilePath]._value = codeString;
    }
}

// 递归
function visitDependency(params: VisitDependencyParams) {
    const { compilation, publicPkgReference, publicFile, subResource, filePath, type } = params;
    const { subpkgUse, dependencies, name } = publicPkgReference[publicFile];
    dependencies.forEach((dep: string) => {
        Object.keys(publicPkgReference[dep].subpkgUse).forEach((subpkg) => {
            if (subpkg === ASYNC_FILE_NAME) { // key 为 ASYNC_FILE_NAME 说明是子依赖，在递归中处理
                // console.log(`${dep} in ${filePath}, new path=${subResource}/${dep}`)
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
    })
};


function migrate(params: VisitDependencyParams, isFirst: boolean) {
    copyAsset(params);

    if (params.type === ReferenceType.COMPONENTS) {
        changeReferComponentPath(params, isFirst);
    } else {
        changeReferCommonPath(params, isFirst);
    };
}

/**
 * 文件迁移后更改自身引用文件的路径
 * @param compilation 
 * @param oldPath 
 * @param newPath 
 */
function changeReferPathAfterCopy(compilation: webpack.compilation.Compilation, oldPath: string, newPath: string) {
    const sourceDir = path.dirname(oldPath);
    const targetDir = path.dirname(newPath);

    const data = compilation.assets[newPath]._value;
    // 修改文件中引用的其他文件的路径
    const modifiedData = data.replace(/(require\(['"])(\..*?)(['"]\))|(\bfrom\s+['"])(\..*?)(['"])/g, function (match, p1, p2, p3, p4, p5, p6) {
        const referAbsolutePath = path.resolve(sourceDir, p2 || p5);
        const referPath = path.relative(cwd, referAbsolutePath);

        let relativePath;
        // 对于引用的要迁移到子包的文件，不做处理。因为还不确定这些文件迁移后的位置，需要等他们迁移后再更改。
        if (publicPkgCommonReference[referPath]) {
            relativePath = p2 || p5;
        } else {
            relativePath = path.relative(targetDir, referPath);
        }

        if (p2) {
            return p1 + relativePath + p3;
        } else {
            return p4 + relativePath + p6;
        }
    });

    compilation.assets[newPath]._value = modifiedData;

}
function migrateStrategy(compilation: webpack.compilation.Compilation, movePublicFile: string[], publicPkgReference: any, type: ReferenceType) {
    movePublicFile.forEach((publicFile) => {
        const { subpkgUse, dependencies, name } = publicPkgReference[publicFile];
        Object.keys(subpkgUse).forEach((subpkg) => {
            if (subpkg !== ASYNC_FILE_NAME) { // key 为 ASYNC_FILE_NAME 说明是子依赖，不在第一层遍历时处理
                subpkgUse[subpkg].forEach((path: string) => {
                    // path 指明在哪个文件路径中查找，{subpkg}/${publicFile} 指明新的依赖路径是什么
                    migrate({
                        compilation,
                        publicFile,
                        subResource: subpkg,
                        filePath: path,
                        type
                    }, true);

                })

                if (dependencies) {
                    // subpkg 是分包的路径（用于拼接子依赖的路径），filePath 是当前新文件的路径（用于判断在哪个文件中修改）
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

    // 清除主包中的组件
    deleteAssete.forEach(asset => {
        delete compilation.assets[asset];
    });
}
/**
 * 处理不支持分包异步化平台（比如百度）中公共包中组件的引用逻辑
 * publicPkg配置开启后，
 *   wx：加分包配置。注意：没有用到分包文件，但有分包配置，会报错，所以正式上线后，一定要有文件引用公共包
 *   其他：记录引用分包及次数。在判断引用的是async时，且引用的文件不在async时，记录{被引用的文件:[分包1，分包2]}，并记录引用的ast，这样后续在处理时可以直接更改source值。
 * 
 *  统计，只被主包引用且不做修改，被1一个引用放置到分包，并修改引用路径。被多个修改，且配置为true时，放置到主包，不做修改；如果配置为false，则放到各自分包。当不设置配置时，则检查数量，大于3个，放主包，小于3个放分包。
 * @param compilation 
 * @returns 
 */
function managePublicPkgComponentReference(compilation: webpack.compilation.Compilation) {
    const movePublicFile: string[] = filterPublicPkgReference(publicPkgComponentReference);
    migrateStrategy(compilation, movePublicFile, publicPkgComponentReference, ReferenceType.COMPONENTS);
}

function managePublicPkgCommonReference(compilation: webpack.compilation.Compilation) {
    const movePublicFile: string[] = filterPublicPkgReference(publicPkgCommonReference);
    migrateStrategy(compilation, movePublicFile, publicPkgCommonReference, ReferenceType.COMMON);
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
            const reg = new RegExp(compiler.options.output.filename + "");
            Object.keys(compilation.assets).forEach(key => {
                if (reg.test(key)) {
                    delete compilation.assets[key];
                }
            });

            // 处理公共组件包及commonjs
            if (!config.publicPkg || config.requireAsync) {
                return;
            }
            managePublicPkgComponentReference(compilation);
            managePublicPkgCommonReference(compilation);
            debugger
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
                const newMenifest = rebuildManifest(originManifestJson, globalStore.quickPageDisplayConifg)
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