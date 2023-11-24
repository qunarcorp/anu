// @ts-nocheck
import * as t from '@babel/types';
import g from '@babel/generator';
import path from 'path';
import * as fs from 'fs-extra';
import config from '../../config/config';
import traverse from '@babel/traverse';
import utils from '../utils';

function isChaikaMode() {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
}

/**
 * 
 * 抽取公共函数
 * 
 * e.g
 * 
 * import React from '@react';
 * function a() {}
 * function b() {}
 * function c() {}
 * App();
 * 
 * =============>
 * 
 * import React from '@react';
 * import {a, b, c} from '${somePath}.js';
 * App();
 * 
 */

// 如何保证顺序？
// 公共函数
const fnNameList = ['ownKeys', '_objectSpread', '_defineProperty', '_toPropertyKey', '_toPrimitive', 'asyncGeneratorStep', '_asyncToGenerator'];
// 只有这两个是需要引入的，其他几个函数皆是这两个函数调用
const onlyImportFnNameList = ['_objectSpread', '_asyncToGenerator'];
const cwd = process.cwd();

// 用于搜集所有文件里面的特定函数
const closureCache = [];

const visitor = {
    Program: {
        exit(astPath, state){
            astPath.traverse({
                FunctionDeclaration: {
                    exit: (astPath, state) => {
                        const curFnName = astPath.node.id.name;
                        if (!fnNameList.includes(curFnName)) return;
                        // 只有这两个是需要引入的，其他几个函数皆是这两个函数调用
                        if (onlyImportFnNameList.includes(curFnName)){
                            this.injectInportSpecifiers.push(curFnName);
                        }
                        // 已经存过，就不用再存
                        if (!closureCache.find(el => el.name === curFnName)) {
                            closureCache.push({
                                code: g(astPath.node).code,
                                name: curFnName
                            });
                            // 如果有新增的函数就需要重新写文件
                            // 比如A文件有a,b,c函数，B文件有b,c,d，分析到B文件，往closureCache新增了d，则公共文件就重新写入
                            this.needWrite = true;
                        } 
                        astPath.remove();
                    }
                }
            });

          
            // 插入 import 节点
            if (!this.injectInportSpecifiers.length) return;
          
          
            const importSourcePath = utils.fixWinPath(path.relative(
                path.parse(utils.getDistPathFromSoucePath(utils.fixWinPath(state.filename))).dir,
                this.distCommonPath
            ));
            const specifiersAst = this.injectInportSpecifiers.map(name => t.importSpecifier(t.identifier(name), t.identifier(name)));
            // from 'a/b/c' => from './a/b/c'
            const sourceAst = t.StringLiteral(
                !/^\./.test(importSourcePath) ? `./${importSourcePath}` : importSourcePath
            )
            
            astPath.node.body.unshift(
                t.importDeclaration(
                    specifiersAst,
                    sourceAst
                )
            );
            
        }
    }
};

module.exports = [
    function() {
        return {
            pre(){
                // 用于搜集当前需要插入的 import 函数名
                this.injectInportSpecifiers = [];
                this.distCommonPath = path.join(utils.getDistDir(), 'internal/runtimecommon.js');
                // 用于标示公共文件是否需要重新写入
                this.needWrite = false;
            },
            visitor,
            post(){
                if (process.env.JENKINS_URL && process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') return;
                this.injectInportSpecifiers = [];
                if (!this.needWrite) return;
                const codesList = closureCache.map(el => el.code);
                const exportCode = codesList.reduce(function(acc, curCode) {
                    return acc + `export ${curCode}\n\n\n`;
                }, '');

                fs.ensureFileSync(this.distCommonPath);
                fs.writeFileSync(this.distCommonPath, exportCode);
            }
        };
    }
];