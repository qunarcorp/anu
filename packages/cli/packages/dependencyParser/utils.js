"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const judgeJsAttributeTypeByPath = (filePath, platform) => {
    const extName = path_1.default.extname(filePath);
    if (!extName)
        return const_1.JS_ATTRIBUTE_TYPE.OTHER;
    if (const_1.JS_FILE_GROUP.some(ext => ext === extName)) {
        const fileName = path_1.default.basename(filePath, extName);
        if (fileName === 'app') {
            const jsonPath = filePath.replace(extName, '.json');
            if (fs_extra_1.default.existsSync(jsonPath)) {
                return const_1.JS_ATTRIBUTE_TYPE.APP;
            }
        }
        if (fileName === 'index') {
            const xmlPath = filePath.replace(extName, const_1.FILE_EXT_MAP[platform].xml);
            const jsonPath = filePath.replace(extName, '.json');
            const json = require(jsonPath);
            if (fs_extra_1.default.existsSync(xmlPath) && !json.component) {
                return const_1.JS_ATTRIBUTE_TYPE.PAGE;
            }
            if (fs_extra_1.default.existsSync(xmlPath) && json.component) {
                return const_1.JS_ATTRIBUTE_TYPE.COMPONENT;
            }
        }
        return const_1.JS_ATTRIBUTE_TYPE.SCRIPT;
    }
    else {
        return const_1.JS_ATTRIBUTE_TYPE.OTHER;
    }
};
exports.judgeJsAttributeTypeByPath = judgeJsAttributeTypeByPath;
const isDirectory = (filePath) => {
    try {
        return fs_extra_1.default.statSync(filePath).isDirectory();
    }
    catch (e) { }
    return false;
};
exports.isDirectory = isDirectory;
