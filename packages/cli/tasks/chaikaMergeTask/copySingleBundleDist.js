"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const fs_extra_1 = __importDefault(require("fs-extra"));
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
const cwd = process.cwd();
const buildType = mergeUtils_1.get_buildType();
const ANU_ENV = mergeUtils_1.get_ANU_ENV();
const BUILD_ENV = mergeUtils_1.get_BUILD_ENV();
function copySingleBundleToFullBundle(from, to, globList) {
    const files = globList || glob_1.default.sync(from + '/**', { nodir: true });
    const allPromiseCopy = files.map((file) => {
        const srcFile = path_1.default.join(file);
        const distFile = path_1.default.join(to, path_1.default.relative(from, file));
        fs_extra_1.default.ensureFileSync(distFile);
        return fs_extra_1.default.copyFile(srcFile, distFile);
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
