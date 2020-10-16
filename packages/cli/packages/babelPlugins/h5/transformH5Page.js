"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const template_1 = __importDefault(require("@babel/template"));
const t = __importStar(require("@babel/types"));
const extraImportedPath = template_1.default(`
import dynamicPage from '@internalComponents/HOC/dynamicPage';
`)();
let pageName = '';
module.exports = function () {
    return {
        visitor: {
            Program: {
                exit(astPath) {
                    astPath.node.body.unshift(extraImportedPath);
                }
            },
            ExportDefaultDeclaration(astPath) {
                const declaration = astPath.node.declaration;
                astPath.node.declaration = t.callExpression(t.identifier('dynamicPage'), [declaration]);
            },
            ClassDeclaration(classPath) {
                let pageConfig;
                pageName = classPath.get('id').get('name').node;
                classPath.traverse({
                    ClassMethod(astPath) {
                        if (astPath.node.kind === 'constructor') {
                            astPath.traverse({
                                AssignmentExpression(path) {
                                    const left = path.get('left');
                                    const right = path.get('right');
                                    if (left.type === 'MemberExpression' &&
                                        left.get('object').node.type === 'ThisExpression' &&
                                        left.get('property').node.name === 'config' &&
                                        right.type === 'ObjectExpression') {
                                        pageConfig = right.node;
                                    }
                                }
                            });
                        }
                    }
                });
                if (pageConfig) {
                    classPath.insertAfter(t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.identifier(pageName), t.identifier('config')), pageConfig)));
                }
            }
        }
    };
};
