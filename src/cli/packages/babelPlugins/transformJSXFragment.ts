import * as t from '@babel/types';
import { NodePath, PluginObj } from '@babel/core';

let visitor = {
    JSXFragment:{
        // 兼容空标签
        enter(astPath: NodePath<t.JSXFragment>){
            astPath.replaceWith(
                t.jSXElement(
                    t.jsxOpeningElement(t.jsxIdentifier('view'), []),
                    t.jSXClosingElement(t.jsxIdentifier('view')),
                    astPath.node.children,
                ),
            );
        }
    },
};

module.exports = function (): PluginObj {
    return {
        visitor: visitor
    };
};
