import * as t from '@babel/types';
import { NodePath, PluginObj } from '@babel/core';
import config from '../../config/config';
import platforms from '../../consts/platforms';
/**
 * 根据函数命名的后缀，来区分平台打包，示例：
 * function demo_wx(){}
 * function demo_ali(){}
 * function demo(){}
 * 如果当前平台为wx，则会把demo_ali和demo都清空，demo_wx重命名为demo,用户调用的时候是调用demo()
 * 
 */
let visitor = {
    ClassMethod: {
        enter(astPath: NodePath<t.ClassMethod>) {

            const node = astPath.node;
            const methodName: string = node.key.name;
            const siblingsNodes = astPath.container;

            // 【默认方法写在前】判断当前方法是否为默认方法，且同级方法中没有带当前平台后缀的方法。
            const hasCurrentPlatformMethod = siblingsNodes.some(siblingsNode => siblingsNode.type === 'ClassMethod' && siblingsNode.key.name === (methodName + '_' + config.buildType));
            if (hasCurrentPlatformMethod) {
                astPath.remove();
                return false;
            }


            for (let i = 0,pLen = platforms.length; i < pLen; i++) {
                const platformType = platforms[i].buildType;
                if (methodName.endsWith(`_${platformType}`)) {
                    if (platformType === config.buildType) {// 为当前平台
                        // 【默认方法写在后】查看默认函数是否存在，存在则删除.
                        // 不带后缀的方法名
                        const methodNameWithoutSuf = methodName.substr(0, methodName.length - platformType.length - 1);

                        // 定位默认函数的位置
                        let indexWithoutSuf = -1;
                        for (let j = 0, len = siblingsNodes.length; j < len; j++) {
                            if (siblingsNodes[j].type === 'ClassMethod' && siblingsNodes[j].key.name === methodNameWithoutSuf) {
                                indexWithoutSuf = j;
                                break;
                            }
                        }

                        // 移除默认方法
                        if (indexWithoutSuf != -1) {
                            astPath.getSibling(indexWithoutSuf).remove();
                        }

                        // 把函数名重置为默认函数
                        astPath.node.key.name = methodNameWithoutSuf;

                    } else {// 不是当前打包平台则删除
                        astPath.remove();
                    }
                    break;
                }
            }
        }
    }
};

module.exports = function (): PluginObj {
    return {
        visitor: visitor
    };
};
