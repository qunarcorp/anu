"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __importDefault(require("../../packages/utils"));
const isMutilePack_1 = require("../../tasks/chaikaMergeTask/isMutilePack");
const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');
class ChaikaPlugin {
    apply(compiler) {
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            compilation.contextDependencies.add(path.join(utils_1.default.getProjectRootPath(), 'source'));
        });
        compiler.hooks.watchRun.tap(id, () => {
            const { watchFileSystem } = compiler;
            const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;
            const changedFile = Object.keys(watcher.mtimes);
            const sourceReg = /\/source\//;
            changedFile.forEach((file) => {
                const patchedFile = file.replace(/\\/g, '/');
                if (sourceReg.test(patchedFile)
                    && !/\/\.CACHE\//.test(patchedFile)) {
                    fs.copy(file, file.replace(sourceReg, `/.CACHE/nanachi/${isMutilePack_1.getMultiplePackDirPrefix()}/source/`.replace(/\/\//g, '/')), (err) => {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            });
        });
    }
}
exports.default = ChaikaPlugin;
