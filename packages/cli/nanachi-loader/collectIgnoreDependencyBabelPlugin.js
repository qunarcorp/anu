"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globalStore_1 = __importDefault(require("../packages/utils/globalStore"));
exports.default = () => {
    const vistor = {
        Program: {
            enter(path, state) {
                state.ignoreModulesPath = {};
            },
            exit(path, state) {
                if (Object.keys(state.ignoreModulesPath).length === 0) {
                    return;
                }
                const match = state.file.opts.filename.match(/(.*)\/.*\..*$/);
                if (!match) {
                    return;
                }
                const context = match[1];
                if (globalStore_1.default.ignoreModulesPath[context] === undefined) {
                    globalStore_1.default.ignoreModulesPath[context] = state.ignoreModulesPath;
                }
                else {
                    globalStore_1.default.ignoreModulesPath[context] = Object.assign(Object.assign({}, globalStore_1.default.ignoreModulesPath[context]), state.ignoreModulesPath);
                }
            }
        },
        ImportDeclaration(path, state) {
            const node = path.node;
            const ignoreModulesPath = state.ignoreModulesPath;
            const modulePath = node.source.value;
            if (node.leadingComments) {
                node.leadingComments.forEach((comment) => {
                    if (comment.value.indexOf('nanachi-ignore-dependency') > -1) {
                        ignoreModulesPath[modulePath] = true;
                    }
                });
            }
        }
    };
    return {
        name: 'babel-plugin-collect-ignore-dependency',
        visitor: vistor
    };
};
