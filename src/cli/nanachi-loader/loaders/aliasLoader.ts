import { MAP } from '../../consts/index';
import * as babel from '@babel/core';
import { NanachiLoaderStruct } from './nanachiLoader';
import getAliasMap, { Alias } from '../../consts/alias';
import calculateAlias from '../../packages/utils/calculateAlias';

//提取package.json中的别名配置
function resolveAlias(code: string, aliasMap: Alias, relativePath: string, ast: any, ctx: any) {
    const babelConfig: babel.TransformOptions = {
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
            ]
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