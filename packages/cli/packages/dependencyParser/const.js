"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config/config"));
exports.PARSER_SUPPORT_PLATFORM = ['wx', 'qq', 'ali', 'bu', 'tt'];
exports.JS_ATTRIBUTE_TYPE = {
    SCRIPT: 'script',
    APP: 'app',
    PAGE: 'page',
    COMPONENT: 'component',
    OTHER: 'other'
};
class DependencyNode {
    constructor(path = '', imports = {}) {
        this.path = path;
        this.type = exports.JS_ATTRIBUTE_TYPE.OTHER;
        this.imports = imports;
        this.subModules = {};
    }
}
exports.DependencyNode = DependencyNode;
exports.IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
};
exports.JS_FILE_GROUP = ['.js', '.ts', '.jsx', '.tsx'];
exports.FILE_EXT_MAP = {
    wx: {
        css: config_1.default.wx.styleExt || '.wxss',
        xml: config_1.default.wx.xmlExt || '.wxml'
    },
    qq: {
        css: config_1.default.qq.styleExt || '.qss',
        xml: config_1.default.qq.xmlExt || '.qml'
    },
    ali: {
        css: config_1.default.ali.styleExt || '.acss',
        xml: config_1.default.ali.xmlExt || '.axml'
    },
    bu: {
        css: config_1.default.bu.styleExt || '.css',
        xml: config_1.default.bu.xmlExt || '.swan'
    },
    tt: {
        css: config_1.default.tt.styleExt || '.ttss',
        xml: config_1.default.tt.xmlExt || '.ttml'
    }
};
