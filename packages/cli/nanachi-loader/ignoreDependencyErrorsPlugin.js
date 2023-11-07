"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globalStore_1 = __importDefault(require("../packages/utils/globalStore"));
const id = 'IgnoreDependencyErrorsPlugin';
class IgnoreDependencyErrorsPlugin {
    apply(compiler) {
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            const ignoreModulesPath = globalStore_1.default.ignoreModulesPath;
            if (Object.keys(ignoreModulesPath).length === 0) {
                return;
            }
            const errors = compilation.errors.filter((err) => {
                try {
                    if (err.name === 'ModuleNotFoundError') {
                        const msg = err.message;
                        const matchKey = msg.match(/Can't resolve '(.+?)'/);
                        const matchValue = msg.match(/in '(.+?)'/);
                        if (matchKey && matchKey[1] && matchValue && matchValue[1]) {
                            const moduleImportPath = matchKey[1];
                            const moduleResourcePath = matchValue[1];
                            const modulePath = ignoreModulesPath[moduleResourcePath];
                            if (modulePath && modulePath[moduleImportPath]) {
                                return false;
                            }
                        }
                    }
                    return true;
                }
                catch (e) {
                    return true;
                }
            });
            compilation.errors = errors;
        });
    }
}
exports.default = IgnoreDependencyErrorsPlugin;
