"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
let userConfig = {};
let nanachiConfig = {};
try {
    const pkg = require(path.join(process.cwd(), 'package.json'));
    userConfig = pkg.nanachi || pkg.mpreact || userConfig;
    nanachiConfig = require(path.join('..', 'package.json'));
}
catch (err) {
}
const buildDir = userConfig.buildDir || 'dist';
const sourceDir = userConfig.sourceDir || 'source';
var Platforms;
(function (Platforms) {
    Platforms["wx"] = "wx";
    Platforms["qq"] = "qq";
    Platforms["ali"] = "ali";
    Platforms["bu"] = "bu";
    Platforms["tt"] = "tt";
    Platforms["quick"] = "quick";
    Platforms["h5"] = "h5";
    Platforms["QIHOO"] = "360";
})(Platforms || (Platforms = {}));
const config = {
    wx: {
        libName: 'ReactWX',
        styleExt: 'wxss',
        xmlExt: 'wxml',
        helpers: 'wxHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    qq: {
        libName: 'ReactWX',
        styleExt: 'qss',
        xmlExt: 'qml',
        helpers: 'qqHelpers',
        patchComponents: {},
        disabledTitleBarPages: new Set()
    },
    ali: {
        libName: 'ReactAli',
        styleExt: 'acss',
        xmlExt: 'axml',
        helpers: 'aliHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    bu: {
        libName: 'ReactBu',
        styleExt: 'css',
        xmlExt: 'swan',
        helpers: 'buHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    h5: {
        libName: 'ReactH5',
        helpers: 'h5Helpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    '360': {
        libName: 'ReactH5',
        helpers: 'h5Helpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    quick: {
        libName: 'ReactQuick',
        jsExt: 'ux',
        helpers: 'quickHelpers',
        patchComponents: {
            'radio': 1,
            'radio-group': 1,
            'checkbox': 1,
            'checkbox-group': 1,
            'label': 1,
            'navigator': 1,
            'picker': 1
        },
        disabledTitleBarPages: new Set()
    },
    tt: {
        libName: 'ReactWX',
        jsExt: 'js',
        styleExt: 'ttss',
        xmlExt: 'ttml',
        helpers: 'ttHelpers',
        patchComponents: {},
        disabledTitleBarPages: new Set()
    },
    buildType: 'wx',
    buildDir: buildDir,
    sourceDir: sourceDir,
    huawei: false,
    '360mode': false,
    typescript: false,
    nanachiVersion: nanachiConfig.version,
    patchComponents: {},
    pluginTags: {},
    plugins: {}
};
module.exports = config;
exports.default = config;
