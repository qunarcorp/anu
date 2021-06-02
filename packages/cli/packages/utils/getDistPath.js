"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config/config"));
function fixWinPath(p) {
    return p.replace(/\\/g, '/');
}
function getDistPath(sourcePath) {
    sourcePath = fixWinPath(sourcePath);
    let nodeModuleReg = /\/node_modules\//;
    let distPath = '';
    distPath = nodeModuleReg.test(sourcePath)
        ? sourcePath
            .replace(nodeModuleReg, `/${config_1.default.buildDir}/npm/`)
            .replace(/\/\//g, '/')
        : sourcePath
            .replace(/\/source\//, `/${config_1.default.buildDir}/`)
            .replace(/\/\//g, '/');
    distPath = process.env.ANU_ENV === 'quick'
        ? distPath.replace(new RegExp('/' + config_1.default.buildDir + '/'), '/src/')
        : distPath;
    return distPath;
}
;
module.exports = getDistPath;
exports.default = getDistPath;
