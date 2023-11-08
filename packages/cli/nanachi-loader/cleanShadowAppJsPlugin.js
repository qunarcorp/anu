"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
const id = 'CleanShadowAppJsPlugin';
class CleanShadowAppJsPlugin {
    constructor(options) {
        this.pathsToDelete = options.pathsToDelete || [];
    }
    apply(compiler) {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
            console.log(compiler.options);
            if (!compiler.options.watch) {
                console.log('afterEmit 钩子触发，只给 build 触发');
            }
        });
        compiler.hooks.watchClose.tap(id, () => {
            console.log('watch 关闭钩子');
        });
    }
    cleanSourceCode() {
        this.pathsToDelete.forEach((sourcePath) => {
            const fullPath = path.resolve(__dirname, sourcePath);
            if (fs.existsSync(fullPath)) {
                if (fs.statSync(fullPath).isDirectory()) {
                    fs.rmdirSync(fullPath, { recursive: true });
                }
                else {
                    fs.unlinkSync(fullPath);
                }
                console.log(`[CleanShadowAppJsPlugin] 指定的文件或者目录已经被删除，路径：${fullPath}`);
            }
        });
    }
}
exports.default = CleanShadowAppJsPlugin;
