import { MAP } from '../../consts/index';
import * as babel from '@babel/core';
import * as t from '@babel/types';
import * as path from 'path';
import { NodePath } from '@babel/core';
import { NanachiLoaderStruct } from './nanachiLoader';
import getAliasMap, { Alias } from '../../consts/alias';
import calculateAlias from '../../packages/utils/calculateAlias';
import config from '../../config/config';
const buildType = config['buildType'];

const visitor: babel.Visitor = {
    ImportDeclaration(astPath: NodePath<t.ImportDeclaration>, state: any) {
        if (buildType !== 'wx') {
            return;
        }

        let node = astPath.node;
        let source = node.source.value;

        if (/\.(less|scss|sass|css)$/.test(path.extname(source))) {
            return;
        }

        if (/\/components\//.test(source)) {
            return;
        }

        const specifiers = node.specifiers;
        const currentPath = state.file.opts.sourceFileName;
        const dir = path.dirname(currentPath);
        const sourceAbsolute = path.join(dir, source);

        let currentPageInPackagesIndex = -1, importComponentInPackagesIndex = -1;
        let currentExec, importExec;
        for (let i = 0, len = global.subpackages.length; i < len; i++) {
            const subpackage = global.subpackages[i];
            if (currentPath.startsWith(`${subpackage.resource}`)) {
                currentPageInPackagesIndex = i;
                currentExec = true;
            }

            if (sourceAbsolute.startsWith(`${subpackage.resource}`)) {
                importComponentInPackagesIndex = i;
                importExec = true;
            }

            if (currentExec && importExec) {
                break;
            }
        }

        // 如果是分包则对进行转换
        if (importComponentInPackagesIndex !== -1 && currentPageInPackagesIndex !== importComponentInPackagesIndex) {
            const specifierNameList = specifiers.map(specifier => {
                return specifier.local.name;
            });

            const list = specifierNameList.map(name => `${name} = v.${name};\n`);
            const code = `
                let ${specifierNameList.join(',')};
                require.async("${source}").then(v => {
                    ${list}
                }).catch(({v, errMsg}) => {
                    console.error("异步获取js出错",v, errMsg);
                })
            `;
            const result = babel.transformSync(code, {
                ast: true,
                sourceType: 'unambiguous'
            });

            astPath.insertAfter(result.ast);
            astPath.remove();
        }

    },
};

function checkRequireAsync() {
    return {
        visitor
    };
}

//提取package.json中的别名配置
function resolveAlias(code: string, aliasMap: Alias, relativePath: string, ast: any, ctx: any) {
    const babelConfig: babel.TransformOptions = {
        ast: true,
        configFile: false,
        babelrc: false,
        sourceMaps: true,
        comments:false,
        sourceFileName: relativePath,
        plugins: [
            [
                require('babel-plugin-module-resolver'),       
                {
                    resolvePath(moduleName: string) {
                        //计算别名配置以及处理npm路径计算
                        return calculateAlias(ctx.resourcePath, moduleName, ctx._compiler.options.externals);
                    }
                }
            ],
            buildType === 'wx' ? checkRequireAsync: null,// 校验是否是异步js
        ]
    };
    let result;
    if (ast) {
        result = babel.transformFromAstSync(ast, null, babelConfig);
    } else {
        result = babel.transformSync(code, babelConfig);
    }
    return result;
}

/**
 * 别名解析loader，将queue中代码的别名解析成相对路径
 */

module.exports = async function({ queues = [], exportCode = '' }: NanachiLoaderStruct, map: any, meta: any) {
    const aliasMap = getAliasMap(this.nanachiOptions.platform);
    let ctx = this;
    const callback = this.async();
    queues = queues.map((item) => {
        let { code = '', path: filePath, type, ast, fileMap } = item;
        const relativePath = type ? filePath.replace(/\.\w+$/, `.${MAP[this.nanachiOptions.platform]['EXT_NAME'][type] || type}`) : filePath;


        let res;
        if (type === 'js') {
           
            res = resolveAlias(code, aliasMap, relativePath, ast, ctx);
            code = res.code;
            ast = res.ast;
        }
        if (type === 'ux') {
           
            code = code.toString().replace(/<script>([\s\S]*?)<\/script>/mg, function(match, jsCode) {
                jsCode = resolveAlias(jsCode, aliasMap, relativePath, ast, ctx).code;
                return `<script>${jsCode}</script>`;
            });
        }
        return {
            ...item,
            fileMap: res? res.map : fileMap,
            code,
            path: relativePath,
            type,
            ast
        };
    });
    
    callback(null, { queues, exportCode }, map, meta);
};