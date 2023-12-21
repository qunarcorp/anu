"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const const_1 = require("./const");
const utils_1 = require("./utils");
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
class DependencyNode {
    constructor(path = '', imports = {}) {
        this.path = path;
        this.type = const_1.JS_ATTRIBUTE_TYPE.OTHER;
        this.imports = imports;
        this.subModules = {};
    }
}
const visitedModules = new Set();
const IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
};
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
function isDirectory(filePath) {
    try {
        return fs_extra_1.default.statSync(filePath).isDirectory();
    }
    catch (e) { }
    return false;
}
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
    if (isDirectory(modulePath)) {
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
function moduleResolver(curModulePath, requirePath) {
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
function traverseJsModule(curModulePath, dependencyGraphNode, platform) {
    const moduleFileContent = fs_extra_1.default.readFileSync(curModulePath, {
        encoding: 'utf-8'
    });
    dependencyGraphNode.path = curModulePath;
    dependencyGraphNode.type = utils_1.judgeJsAttributeTypeByPath(curModulePath, platform);
    const ast = parser.parse(moduleFileContent, {
        sourceType: 'unambiguous',
        plugins: resolveBabelSyntaxPlugins(curModulePath)
    });
    traverse(ast, {
        ImportDeclaration(path) {
            const subModulePath = moduleResolver(curModulePath, path.get('source.value').node);
            if (!subModulePath) {
                return;
            }
            const specifierPaths = path.get('specifiers');
            dependencyGraphNode.imports[subModulePath] = specifierPaths.map((specifierPath) => {
                if (specifierPath.isImportSpecifier()) {
                    return {
                        type: IMPORT_TYPE.deconstruct,
                        imported: specifierPath.get('imported').node.name,
                        local: specifierPath.get('local').node.name
                    };
                }
                else if (specifierPath.isImportDefaultSpecifier()) {
                    return {
                        type: IMPORT_TYPE.default,
                        local: specifierPath.get('local').node.name
                    };
                }
                else {
                    return {
                        type: IMPORT_TYPE.namespace,
                        local: specifierPath.get('local').node.name
                    };
                }
            });
            const subModule = new DependencyNode();
            traverseJsModule(subModulePath, subModule, platform);
            dependencyGraphNode.subModules[subModule.path] = subModule;
        }
    });
    switch (dependencyGraphNode.type) {
        case const_1.JS_ATTRIBUTE_TYPE.APP: {
            break;
        }
        case const_1.JS_ATTRIBUTE_TYPE.PAGE: {
            break;
        }
    }
}
const traverseModule = (curModulePath, platform) => {
    const dependencyGraph = new DependencyNode();
    traverseJsModule(curModulePath, dependencyGraph, platform);
    return {
        dependencyGraph,
        visitedModules: Array.from(visitedModules)
    };
};
exports.default = traverseModule;
