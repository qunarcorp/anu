"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const index_1 = __importDefault(require("../../packages/utils/index"));
const config_1 = __importDefault(require("../../config/config"));
const projectRootPath = index_1.default.getProjectRootPath();
const isMultiple = function () {
    const pkgJson = require(path_1.default.join(projectRootPath, 'package.json'));
    const isMultiple = (pkgJson.nanachi || {}).multiple || false;
    return isMultiple;
};
exports.default = isMultiple;
exports.getMultiplePackDirPrefix = function () {
    return isMultiple ? config_1.default.buildType : '';
};
exports.getMultiplePackDirPrefixNew = function () {
    return isMultiple() ? config_1.default.buildType : '';
};
