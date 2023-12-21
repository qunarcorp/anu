"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const configResolver_1 = require("./configResolver");
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = require("./utils");
const parser_1 = __importDefault(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const const_1 = require("./const");
const moduleResolver_1 = require("./moduleResolver");
class DependencyParser {
    constructor(options) {
        this.config = new configResolver_1.ConfigResolver(options);
        this.visitedModules = new Set();
    }
    parse() {
        this.__clearVisitedModules();
        console.time('[DependencyParser] parse');
        console.timeEnd('[DependencyParser] parse');
    }
    treeShaking() {
    }
    __clearVisitedModules() {
        this.visitedModules.clear();
    }
    __traverseModule(curModulePath, platform) {
        const dependencyGraph = new const_1.DependencyNode();
        this.__traverseJsModule(curModulePath, dependencyGraph, platform);
        return {
            dependencyGraph,
            visitedModules: Array.from(this.visitedModules)
        };
    }
    __traverseJsModule(curModulePath, dependencyGraphNode, platform) {
        const moduleFileContent = fs_extra_1.default.readFileSync(curModulePath, {
            encoding: 'utf-8'
        });
        dependencyGraphNode.path = curModulePath;
        dependencyGraphNode.type = utils_1.judgeJsAttributeTypeByPath(curModulePath, platform);
        const ast = parser_1.default.parse(moduleFileContent, {
            sourceType: 'unambiguous',
            plugins: moduleResolver_1.resolveBabelSyntaxPlugins(curModulePath)
        });
        traverse_1.default(ast, {
            ImportDeclaration: (path) => {
                const subModulePath = moduleResolver_1.moduleResolver(curModulePath, path.get('source.value').node, this.visitedModules);
                if (!subModulePath) {
                    return;
                }
                const specifierPaths = path.get('specifiers');
                dependencyGraphNode.imports[subModulePath] = specifierPaths.map((specifierPath) => {
                    if (specifierPath.isImportSpecifier()) {
                        return {
                            type: const_1.IMPORT_TYPE.deconstruct,
                            imported: specifierPath.get('imported').node.name,
                            local: specifierPath.get('local').node.name
                        };
                    }
                    else if (specifierPath.isImportDefaultSpecifier()) {
                        return {
                            type: const_1.IMPORT_TYPE.default,
                            local: specifierPath.get('local').node.name
                        };
                    }
                    else {
                        return {
                            type: const_1.IMPORT_TYPE.namespace,
                            local: specifierPath.get('local').node.name
                        };
                    }
                });
                const subModule = new const_1.DependencyNode();
                this.__traverseJsModule(subModulePath, subModule, platform);
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
}
exports.default = DependencyParser;
