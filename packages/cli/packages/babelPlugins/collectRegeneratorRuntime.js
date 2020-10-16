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
const t = __importStar(require("@babel/types"));
const config_1 = __importDefault(require("../../config/config"));
let hackList = ['wx', 'bu', 'tt', 'quick', 'qq'];
let visitor = {
    FunctionDeclaration: {
        exit(astPath) {
            let name = astPath.node.id.name;
            if (!(name === '_asyncToGenerator' && hackList.includes(config_1.default.buildType))) {
                return;
            }
            let root = astPath.findParent(t.isProgram);
            root.node.body.unshift(t.variableDeclaration('var', [
                t.variableDeclarator(t.identifier('regeneratorRuntime'), t.callExpression(t.identifier('require'), [
                    t.stringLiteral('regenerator-runtime/runtime')
                ]))
            ]));
        }
    }
};
module.exports = [
    require('@babel/plugin-transform-async-to-generator'),
    function () {
        return {
            visitor: visitor
        };
    }
];
