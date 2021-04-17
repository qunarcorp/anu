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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const getDistPath_1 = __importDefault(require("./getDistPath"));
const calculateAlias_1 = __importDefault(require("./calculateAlias"));
const cwd = process.cwd();
let cachedUsingComponents = {};
function fixWinPath(p) {
    return p.replace(/\\/g, '/');
}
function calculateComponentsPath(bag) {
    if (!path.isAbsolute(bag.sourcePath)) {
        console.error('bag.sourcePath 必须为绝对路径.');
        process.exit(1);
    }
    if (cachedUsingComponents[bag.source]) {
        return cachedUsingComponents[bag.source];
    }
    let realPath = path.join(path.dirname(bag.sourcePath), calculateAlias_1.default(bag.sourcePath, bag.source));
    realPath = fixWinPath(realPath).replace(/\.js$/, '');
    let usingPath = getDistPath_1.default(realPath)
        .replace(fixWinPath(path.join(cwd, 'dist')), '');
    cachedUsingComponents[bag.source] = usingPath;
    return usingPath;
}
;
module.exports = calculateComponentsPath;
exports.default = calculateComponentsPath;
