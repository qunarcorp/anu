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
exports.retrieveNanachiConfig = exports.rootDirectory = exports.production = exports.outputDirectory = exports.assetsDirectoryName = exports.sourceDirectoryName = exports.intermediateDirectoryName = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const ramda_1 = __importDefault(require("ramda"));
exports.intermediateDirectoryName = '__intermediate__directory__do__not__modify__';
exports.sourceDirectoryName = 'source';
exports.assetsDirectoryName = 'assets';
exports.outputDirectory = 'dist';
exports.production = process.env.NODE_ENV === 'production';
exports.rootDirectory = path.resolve(process.cwd(), 'dist');
const resolveFromContext = ramda_1.default.curryN(2, path.resolve)(exports.rootDirectory);
function resolveNanachiAlias(alias) {
    const resolved = {
        '@assets': resolveFromContext(`${exports.intermediateDirectoryName}/assets`)
    };
    Object.keys(alias).forEach(function (k) {
        const nanachiAlias = alias[k].replace('source/', '');
        resolved[k] = resolveFromContext(`${exports.intermediateDirectoryName}/${nanachiAlias}`);
    });
    return resolved;
}
function retrieveNanachiConfig() {
    const cwd = process.env.NANACHI_CWD || process.cwd();
    const resolveFromDirCwd = ramda_1.default.curryN(2, path.resolve)(cwd);
    const packageJSONPath = resolveFromDirCwd('package.json');
    let packageJson = {};
    try {
        packageJson = fs.readJSONSync(packageJSONPath);
    }
    catch (e) {
    }
    const { nanachi = {} } = packageJson;
    const { alias = {} } = nanachi;
    return resolveNanachiAlias(alias);
}
exports.retrieveNanachiConfig = retrieveNanachiConfig;
