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
const envReg = /\s*if\s+process\.env\.ANU_ENV\s*={2,3}\s*\'(.*)\';?/;
let visitor = {
    Program: {
        enter(astPath) {
            const nodes = astPath.node.body;
            astPath.node.body = nodes.filter(node => {
                const leadingComments = node.leadingComments;
                if (node.type === 'ImportDeclaration' && leadingComments) {
                    for (let i = 0; i < leadingComments.length; i++) {
                        const { type, value: commentValue } = leadingComments[i];
                        const match = commentValue.match(envReg);
                        if (type === 'CommentLine' && match) {
                            const targetEnvs = match[1];
                            if (targetEnvs && !targetEnvs.includes(config_1.default.buildType)) {
                                return false;
                            }
                            t.removeComments(node);
                        }
                    }
                }
                return true;
            });
        }
    }
};
module.exports = function () {
    return {
        visitor: visitor
    };
};
