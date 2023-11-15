import * as path from 'path';
import utils from '.';
const cwd = process.cwd();
const babel = require('@babel/core');
const nodeResolve = require('resolve');
import config from '../../config/config';
import isMultiple, { getMultiplePackDirPrefix, getMultiplePackDirPrefixNew } from '../../tasks/chaikaMergeTask/isMutilePack';

const getDistPath = require('./getDistPath');
function fixPath(p: string) {
    p = p.replace(/\\/g, '/');
    return /^\w/.test(p) ? './' + p : p;
}

function isSingleBunle() {
    return config.hasNewAppjs && config.isSingleBundle;
}

// 获取 import {a, b, c} from '@xxx/yyy', a, b, c 对应的模块真实路径，只适用于nanachi ui 组件库
const getImportSpecifierFilePath = (function () {
    const ret = {};
    return function (ImportSpecifierIdentifier: string, entryFilePath: string) {
        babel.transformFileSync(entryFilePath, {
            configFile: false,
            babelrc: false,
            comments: false,
            ast: true,
            plugins: [
                [
                    function () {
                        return {
                            visitor: {
                                Program: {
                                    exit: function (astPath: any) {
                                        const body = astPath.get('body');

                                        const allIsExportNamedDeclaration = body.every(function ({ node }) {
                                            // export { default as Nbutton } from './source/components/Button';
                                            return node.type === 'ExportNamedDeclaration' && node.specifiers.length === 1;
                                        });

                                        if (!allIsExportNamedDeclaration) {
                                            return;
                                        }

                                        const exportInfo = body
                                            .map(function ({ node }) {
                                                let src = path.join(path.parse(entryFilePath).dir, node.source.value);
                                                src = src.replace(/(\.js)$/, '').replace(/(\/index)$/, '') + '/index.js';

                                                return {
                                                    name: node.specifiers[0].exported.name,
                                                    src
                                                }
                                            }).reduce(function (acc, cur) {
                                                acc[cur.name] = cur.src;
                                                return acc;
                                            }, {});

                                        ret[entryFilePath] = exportInfo;

                                    }
                                }
                            }

                        }
                    }
                ]
            ]
        });
        return ret[entryFilePath][ImportSpecifierIdentifier];
    }
})();



/**
 * 根据当前文件的绝对路径，以及它 import 模块的资源名，求出引用模块资源的相对路径。
 * 核心是求出import的模块绝对路径，然后 path.relative 走你。
 * @param {string} srcPath 当前文件绝对路径
 * @param {string} importerSource import或者@import的模块路径
 * @return {string} 引用的模块名的相对路径
 */
// import Cat from '@components/Cat/index';
// import Cat from '@PageIndex/Components/Cat/index;
// import a from './a';
// import b from '../b';
// import md5 from 'md5';
// @import url('@globalStyle/reset.css');


function calculateAlias(srcPath: string, importerSource: string, ignoredPaths?: Array<string | RegExp>, importSpecifierName: string): string {
    const aliasMap = require('./calculateAliasConfig')();
    const remoteNpmPackagesMap = require('./calculateRemoteNpmPackages')();

    if (ignoredPaths && ignoredPaths.find((p) => importerSource === p)) {
        return '';
    }
    if (!path.isAbsolute(srcPath)) {
        console.error(`计算alias中的 ${srcPath} 必须为绝对路径.`);
        process.exit(1);
    }

    /*
    srcPath: /Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/nanachi/wx/source/common/utils/logQmark.js
    importerSource: @qnpm/qmark
    */
    // console.log('srcPath:', srcPath);
    // console.log('importerSource:', importerSource);


    let rsegments = importerSource.split('/');
    //import a from './a';
    //import b from '../b';
    if (/^\./.test(rsegments[0])) {
        return importerSource;
    }

    //import Cat from '@components/Cat/index';
    //import Cat from '@PageIndex/Components/Cat/index;
    //@import url('@globalStyle/reset.scss');
    if (aliasMap[rsegments[0]]) {
        let from = path.dirname(getDistPath(srcPath));
        //@common/b/c ==> userPath/project/source/common/a/b
        let to = importerSource.replace(
            new RegExp(rsegments[0]),
            aliasMap[rsegments[0]]
        );

        to = getDistPath(to);

        return fixPath(path.relative(from, to));
    }

    if (path.isAbsolute(importerSource)) {
        let from = path.dirname(srcPath);
        let to = importerSource.replace(/\.js$/, '');
        from = getDistPath(from);
        to = getDistPath(to);
        return fixPath(path.relative(from, to));
    }


    // 上面都没匹配到的，那就是 node_modules 模块了
    // 这里有两种情况，一种是旧的逻辑，也就是匹配当前包（或者说代码合并后）存在的一个 npm 模块
    // 一种是新的逻辑，就是单包打包时，存在引用了非自己包的 npm 依赖，这里通过 userConfig.remoteNpmPackages 来直接匹配（第二种路径通过js是找不到的，只能以文本字面量的形式计算相对路径）
    // 1. import cookie from 'cookie';
    // 2. import QMark from '@qnpm/qmark'; // 此为公共包的一个依赖，nodeResolver 肯定是找不到报错的 -> import QMark from "../../npm/@qnpm/qmark/dist/qmark.mini.umd.js";
    try {
        // 如果 remoteNpmPackagesMap 中存在对应的记录，则直接返回，该逻辑分支只在单包模式下生效
        if (isSingleBunle() && remoteNpmPackagesMap[importerSource]) {
            let from = path.dirname(srcPath);
            from = getDistPath(from);

            // to 不再通过 nodeResovle 获得（也找不到），而是直接拼接出来产物目录下的 'npm' + 列表给出的映射路径
            let to = path.join(utils.getProjectRootPath(), isMultiple() ? 'target' : 'dist', getMultiplePackDirPrefixNew(), 'npm', remoteNpmPackagesMap[importerSource]);
            return fixPath(path.relative(from, to));
        }


        let from = path.dirname(srcPath);
        // let isNncNpmComponentsLib = false;

        let to = nodeResolve.sync(importerSource, {
            basedir: utils.getProjectRootPath(),
            preserveSymlinks: true,
            moduleDirectory: 'node_modules',
        });

        to = getDistPath(to);
        from = getDistPath(from);

        return fixPath(path.relative(from, to));
    } catch (e) {
        // eslint-disable-next-line
        console.log(e);
        return;
    }
}
module.exports = calculateAlias;
export default calculateAlias;
