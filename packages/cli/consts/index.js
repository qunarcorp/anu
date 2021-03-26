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
exports.NANACHI_CONFIG_PATH = exports.MAP = exports.REACT_LIB_MAP = void 0;
const path = __importStar(require("path"));
const cwd = process.cwd();
exports.REACT_LIB_MAP = {
    wx: 'ReactWX.js',
    ali: 'ReactAli.js',
    bu: 'ReactBu.js',
    quick: 'ReactQuick.js',
    h5: 'ReactH5.js',
    qq: 'ReactWX.js',
    tt: 'ReactWX.js'
};
exports.MAP = {
    'wx': {
        EXT_NAME: {
            'css': 'wxss',
            'scss': 'wxss',
            'sass': 'wxss',
            'less': 'wxss',
            'html': 'wxml',
            'jsx': 'js',
        }
    },
    'qq': {
        EXT_NAME: {
            'css': 'qss',
            'scss': 'qss',
            'sass': 'qss',
            'less': 'qss',
            'html': 'qml',
            'jsx': 'js',
        }
    },
    'ali': {
        EXT_NAME: {
            'css': 'acss',
            'scss': 'acss',
            'sass': 'acss',
            'less': 'acss',
            'html': 'axml',
            'jsx': 'js',
        }
    },
    'bu': {
        EXT_NAME: {
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css',
            'html': 'swan',
            'jsx': 'js',
        }
    },
    'tt': {
        EXT_NAME: {
            'css': 'ttss',
            'scss': 'ttss',
            'sass': 'ttss',
            'less': 'ttss',
            'html': 'ttml',
            'jsx': 'js',
        }
    },
    'quick': {
        EXT_NAME: {
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css'
        }
    },
    'h5': {
        EXT_NAME: {
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css'
        }
    },
    '360': {
        EXT_NAME: {
            'css': 'css',
            'scss': 'css',
            'sass': 'css',
            'less': 'css'
        }
    }
};
exports.NANACHI_CONFIG_PATH = path.resolve(cwd, 'nanachi.config.js');
