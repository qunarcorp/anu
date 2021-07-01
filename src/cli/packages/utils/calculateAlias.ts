import * as path from 'path';
import utils from '.';
const cwd = process.cwd();
const babel = require('@babel/core');
const nodeResolve = require('resolve');

const getDistPath = require('./getDistPath');
function fixPath (p: string) {
    p = p.replace(/\\/g, '/');
    return /^\w/.test(p) ? './' + p : p;
}

// 获取 import {a, b, c} from '@xxx/yyy', a, b, c 对应的模块真实路径，只适用于nanachi ui 组件库
const getImportSpecifierFilePath = (function() {
    const ret = {};
    return function(ImportSpecifierIdentifier: string, entryFilePath: string) {
        babel.transformFileSync(entryFilePath, {
            configFile: false,
            babelrc: false,
            comments: false,
            ast: true,
            plugins: [
               function() {
                   return {
                       visitor: {
                          Program: {
                            exit: function(astPath:any) {
                                const body = astPath.get('body');
                                
                                const allIsExportNamedDeclaration = body.every(function({node}) {
                                    // export { default as Nbutton } from './source/components/Button';
                                    return node.type === 'ExportNamedDeclaration' && node.specifiers.length === 1;
                                });

                                if (!allIsExportNamedDeclaration) {
                                    return;
                                }

                                const exportInfo = body
                                .map(function({node}) {
                                    let src = path.join(path.parse(entryFilePath).dir, node.source.value);
                                    src = src.replace(/(\.js)$/, '').replace(/(\/index)$/, '') + '/index.js';

                                    return {
                                        name: node.specifiers[0].exported.name,
                                        src
                                    }
                                }).reduce(function(acc, cur) {
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


function calculateAlias(srcPath: string, importerSource: string, ignoredPaths?: Array<string|RegExp>, importSpecifierName: string): string {
    const aliasMap = require('./calculateAliasConfig')();
    if (ignoredPaths && ignoredPaths.find((p) => importerSource === p)) {
        return '';
    }
    if (!path.isAbsolute(srcPath)) {
        console.error(`计算alias中的 ${srcPath} 必须为绝对路径.`);
        process.exit(1);
    }


    let rsegments = importerSource.split('/');
    //import a from './a';
    //import b from '../b';
    if (/^\./.test(rsegments[0])) {
        return importerSource;
    }
    //import Cat from '@components/Cat/index';
    //import Cat from '@PageIndex/Components/Cat/index;
    //@import url('@globalStyle/reset.scss');
    if ( aliasMap[ rsegments[0] ] ) {
        let from = path.dirname(getDistPath(srcPath));
        //@common/b/c ==> userPath/project/source/common/a/b
        let to = importerSource.replace( 
            new RegExp(rsegments[0]),
            aliasMap[ rsegments[0] ]
        );
        to = getDistPath(to);
    
        return fixPath(path.relative(from, to));
    }


    if (path.isAbsolute(importerSource)) {
        console.log(importerSource);
        let from = path.dirname(srcPath);
        let to = importerSource.replace(/\.js$/, '');
        from = getDistPath(from);
        to = getDistPath(to);
        return fixPath(path.relative(from, to));
    }


    // 上面都没匹配到的，那就是 node_modules 模块了
    // import cookie from 'cookie';
    try {
        let from = path.dirname(srcPath);
        let isNncNpmComponentsLib = false;
       
        let to = nodeResolve.sync(importerSource, {
            basedir: utils.getProjectRootPath(),
            preserveSymlinks: true,
            moduleDirectory: 'node_modules',
            packageFilter: function(pkg) {
                isNncNpmComponentsLib = !!pkg.nnc;
                return pkg;
            }
        });


        if (isNncNpmComponentsLib) {
            if (importSpecifierName) {
                to = getImportSpecifierFilePath(importSpecifierName, to);
            }
           
        }

        
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