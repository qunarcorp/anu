import * as path from 'path';
import nodeResolve from 'resolve';
import * as t from '@babel/types';
import utils from '../utils';
import { NodePath, PluginObj } from '@babel/core';
import config from '../../config/config';


let hackList: any = ['wx', 'bu', 'tt', 'quick', 'qq'];
let needPatch: boolean = false;
let installFlag: boolean = false;
const pkgName = 'regenerator-runtime@0.12.1';

function needInstall( pkgName: string ): boolean{
    try {
        nodeResolve.sync(pkgName, { 
            basedir: process.cwd(),
            moduleDirectory: ''
        });
        return false;
    } catch (err) {
        return true;
    }
}

/**
 * 支持async语法转化为generator语法
 */
module.exports  = [
    require('@babel/plugin-transform-async-to-generator'),
    function(): PluginObj{
        return {
            visitor: {
                Program: {
                    exit(astPathP, state){
                        // 改为从program转化为，而不是直接对FunctionDeclaration，是因为直接写FunctionDeclaration和其他babel插件有一些冲突，导致_asyncToGenerator函数找不到。
                        astPathP.traverse({
                            FunctionDeclaration: {
                                enter: (astPath) => {                        
                                    let name = astPath.node.id.name;
                                    if ( !(name === '_asyncToGenerator' && hackList.includes(config.buildType))  ) {
                                        return;
                                    }

                                    astPathP.node.body.unshift(
                                        t.importDeclaration(
                                            [
                                                t.importDefaultSpecifier(
                                                    t.identifier('regeneratorRuntime')
                                                )
                                            ],
                                            t.stringLiteral('regenerator-runtime/runtime')
                                        )

                                    );
                                    needPatch = true;
                                    // 跳出
                                    astPath.stop();
                                }
                            }
                        });
                    }
                },
            },
            post: function(){
                if ( needPatch && needInstall(pkgName.split('@')[0]) && !installFlag) {
                    utils.installer(pkgName);
                    installFlag = true;
                }
            }
        }
    }
];
