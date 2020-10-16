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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const babel = __importStar(require("@babel/core"));
const isReact = function (sourcePath) {
    const ReactRegExp = new RegExp(`\\${path.sep}source\\${path.sep}React\\w+\\.js$`);
    return ReactRegExp.test(sourcePath);
};
function patchMobx() {
    const ctx = this;
    return {
        visitor: {
            IfStatement: function (astPath) {
                if (!/\/node_modules\/mobx\/lib\/index/
                    .test(ctx.resourcePath.replace(/\\/g, '/')))
                    return;
                astPath.replaceWith(astPath.get('consequent.body.0'));
            },
            CallExpression: function (astPath) {
                const calleeName = astPath.get('callee');
                if (calleeName.node.name === 'define') {
                    astPath.node.arguments = [];
                }
            }
        }
    };
}
module.exports = function (code, map, meta) {
    return __awaiter(this, void 0, void 0, function* () {
        const callback = this.async();
        let relativePath = '';
        let queues;
        if (/\/(webpack)|(process)\//.test(this.resourcePath.replace(/\\/g, ''))) {
            queues = [];
            callback(null, {
                queues,
                exportCode: code
            }, map, meta);
            return;
        }
        var ctx = this;
        code = babel.transformSync(code, {
            configFile: false,
            babelrc: false,
            plugins: [
                ...require('../../packages/babelPlugins/transformEnv'),
                patchMobx.bind(this)
            ]
        }).code;
        if (isReact(this.resourcePath)) {
            relativePath = this.resourcePath.match(/React\w+\.js$/)[0];
            queues = [{
                    code,
                    path: relativePath,
                    type: 'js'
                }];
            callback(null, {
                queues,
                exportCode: ''
            }, map, meta);
            return;
        }
        relativePath = path.join('npm', this.resourcePath.replace(/^.+?[\\\/]node_modules[\\\/]/, ''));
        queues = [{
                code,
                path: relativePath,
                type: 'js'
            }];
        callback(null, {
            queues,
            exportCode: code
        }, map, meta);
    });
};
