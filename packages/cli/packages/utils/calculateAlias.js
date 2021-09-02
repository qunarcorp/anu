"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const _1 = __importDefault(require("."));
const cwd = process.cwd();
const babel = require('@babel/core');
const nodeResolve = require('resolve');
const getDistPath = require('./getDistPath');
function fixPath(p) {
    p = p.replace(/\\/g, '/');
    return /^\w/.test(p) ? './' + p : p;
}
const getImportSpecifierFilePath = (function () {
    const ret = {};
    return function (ImportSpecifierIdentifier, entryFilePath) {
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
                                    exit: function (astPath) {
                                        const body = astPath.get('body');
                                        const allIsExportNamedDeclaration = body.every(function ({ node }) {
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
                                            };
                                        }).reduce(function (acc, cur) {
                                            acc[cur.name] = cur.src;
                                            return acc;
                                        }, {});
                                        ret[entryFilePath] = exportInfo;
                                    }
                                }
                            }
                        };
                    }
                ]
            ]
        });
        return ret[entryFilePath][ImportSpecifierIdentifier];
    };
})();
function calculateAlias(srcPath, importerSource, ignoredPaths, importSpecifierName) {
    const aliasMap = require('./calculateAliasConfig')();
    if (ignoredPaths && ignoredPaths.find((p) => importerSource === p)) {
        return '';
    }
    if (!path.isAbsolute(srcPath)) {
        console.error(`计算alias中的 ${srcPath} 必须为绝对路径.`);
        process.exit(1);
    }
    let rsegments = importerSource.split('/');
    if (/^\./.test(rsegments[0])) {
        return importerSource;
    }
    if (aliasMap[rsegments[0]]) {
        let from = path.dirname(getDistPath(srcPath));
        let to = importerSource.replace(new RegExp(rsegments[0]), aliasMap[rsegments[0]]);
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
    try {
        let from = path.dirname(srcPath);
        let to = nodeResolve.sync(importerSource, {
            basedir: _1.default.getProjectRootPath(),
            preserveSymlinks: true,
            moduleDirectory: 'node_modules',
        });
        to = getDistPath(to);
        from = getDistPath(from);
        return fixPath(path.relative(from, to));
    }
    catch (e) {
        console.log(e);
        return;
    }
}
module.exports = calculateAlias;
exports.default = calculateAlias;
