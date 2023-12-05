"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("./index"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("../../config/config"));
function fixWinPath(p) {
    return p.replace(/\\/g, '/');
}
function getDistPath(sourcePath) {
    sourcePath = fixWinPath(sourcePath);
    let nodeModuleReg = /\/node_modules\//;
    let distPath = '';
    if (nodeModuleReg.test(sourcePath)) {
        distPath = path_1.default.join(index_1.default.getProjectRootPath(), `${config_1.default.buildDir}`, 'npm', sourcePath.split('/node_modules/').pop());
    }
    else {
        if (/\/npm\//.test(sourcePath)) {
            distPath = path_1.default.join(index_1.default.getProjectRootPath(), `${config_1.default.buildDir}/npm`, sourcePath.split('/npm/').pop());
        }
        else if (/\/source\//.test(sourcePath)) {
            distPath = path_1.default.join(index_1.default.getProjectRootPath(), `${config_1.default.buildDir}`, sourcePath.split('/source/').pop());
        }
        else if (/\/src\//.test(sourcePath)) {
            distPath = sourcePath;
        }
        else {
            distPath = path_1.default.join(index_1.default.getProjectRootPath(), `${config_1.default.buildDir}`);
        }
    }
    distPath = process.env.ANU_ENV === 'quick'
        ? distPath.replace(new RegExp('/' + config_1.default.buildDir + '/'), '/src/')
        : distPath;
    return distPath;
}
module.exports = getDistPath;
exports.default = getDistPath;
