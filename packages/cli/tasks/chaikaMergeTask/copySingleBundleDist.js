"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../config/config"));
const chalk = require('chalk');
function copySingleBundleToFullBundle(from, to, globList) {
    const files = globList || glob_1.default.sync(from + '/**', { nodir: true });
    const allPromiseCopy = files.map((file) => {
        const srcFile = path_1.default.join(file);
        const destFile = path_1.default.join(to, path_1.default.relative(from, file));
        if (fs_extra_1.default.existsSync(destFile) && config_1.default.forFirstCompile && config_1.default.isWatch) {
            console.log(chalk.yellow(`[copySingleBundleToFullBundle {初次编译提醒}] 目标路径 ${destFile} 已存在，拷贝时会产生覆盖，请自行检查是否需要处理`));
        }
        fs_extra_1.default.ensureFileSync(destFile);
        return fs_extra_1.default.copyFile(srcFile, destFile);
    });
    return Promise.all(allPromiseCopy || []);
}
function default_1(from, to, globList) {
    return copySingleBundleToFullBundle(from, to, globList)
        .then(function () {
        return Promise.resolve(1);
    })
        .catch(function (err) {
        return Promise.reject(err);
    });
}
exports.default = default_1;
