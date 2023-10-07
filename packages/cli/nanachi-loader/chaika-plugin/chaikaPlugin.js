"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __importDefault(require("../../packages/utils"));
const config_1 = __importDefault(require("../../config/config"));
const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');
class ChaikaPlugin {
    apply(compiler) {
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            let projectList = [utils_1.default.getProjectRootPath()];
            if (config_1.default.multiProject.length > 1) {
                projectList = projectList.concat(config_1.default.multiProject);
            }
            for (let i = 0; i < projectList.length; i++) {
                const projectPath = projectList[i];
                compilation.contextDependencies.add(path.join(projectPath, 'source'));
            }
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
                    const patchArr = patchedFile.split('source');
                    const targetFilePath = path.join(process.cwd(), 'source', patchArr[1]);
                    fs.copy(file, targetFilePath, (err) => {
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
