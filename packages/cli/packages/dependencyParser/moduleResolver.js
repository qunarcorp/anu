"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
function resolveBabelSyntaxPlugins(modulePath) {
    const plugins = [];
    if (['.tsx', '.jsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('jsx');
    }
    if (['.ts', '.tsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('typescript');
    }
    return plugins;
}
exports.resolveBabelSyntaxPlugins = resolveBabelSyntaxPlugins;
function completeModulePath(modulePath) {
    const EXTS = ['.js', '.jsx', '.ts', '.tsx'];
    const extsRegex = new RegExp(`(\\${EXTS.join('|\\')})$`);
    if (modulePath.match(extsRegex)) {
        return modulePath;
    }
    function tryCompletePath(resolvePath) {
        for (let i = 0; i < EXTS.length; i++) {
            let tryPath = resolvePath(EXTS[i]);
            if (fs_extra_1.default.existsSync(tryPath)) {
                return tryPath;
            }
        }
    }
    if (!EXTS.some(ext => modulePath.endsWith(ext))) {
        const tryModulePath = tryCompletePath((ext) => modulePath + ext);
        if (!tryModulePath) {
            throw 'module not found: ' + modulePath;
        }
        else {
            return tryModulePath;
        }
    }
    if (utils_1.isDirectory(modulePath)) {
        const tryModulePathWithExt = tryCompletePath((ext) => modulePath + ext);
        if (tryModulePathWithExt) {
            return tryModulePathWithExt;
        }
        const tryModulePath = tryCompletePath((ext) => path_1.default.join(modulePath, 'index' + ext));
        if (!tryModulePath) {
            throw 'module not found: ' + modulePath;
        }
        else {
            return tryModulePath;
        }
    }
    return modulePath;
}
function moduleResolver(curModulePath, requirePath, visitedModules) {
    requirePath = path_1.default.resolve(path_1.default.dirname(curModulePath), requirePath);
    requirePath = completeModulePath(requirePath);
    if (visitedModules.has(requirePath)) {
        return '';
    }
    else {
        visitedModules.add(requirePath);
    }
    return requirePath;
}
exports.moduleResolver = moduleResolver;
