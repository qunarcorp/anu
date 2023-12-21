import { ConfigResolver, configOptionsType } from './configResolver';
import fs from 'fs-extra';
import { judgeJsAttributeTypeByPath } from './utils';
import parser from '@babel/parser';
import {default as traverse} from '@babel/traverse';
import { JS_ATTRIBUTE_TYPE, DependencyNode, IMPORT_TYPE } from './const';
import { moduleResolver, resolveBabelSyntaxPlugins } from './moduleResolver';

class DependencyParser {
    config: ConfigResolver;
    visitedModules: Set<string>; // parse时遍历过的文件列表
    constructor(options: configOptionsType) {
        this.config = new ConfigResolver(options);
        this.visitedModules = new Set();
    }

    parse() {
        this.__clearVisitedModules();
        console.time('[DependencyParser] parse');
        // this.__traverseModule(this.config.entry, this.config.platform);
        console.timeEnd('[DependencyParser] parse');
    }

    treeShaking() {
        // TODO: 未来实现
    }

    __clearVisitedModules () {
        this.visitedModules.clear();
    }

    __traverseModule (curModulePath: string, platform: string) {
        const dependencyGraph = new DependencyNode();

        this.__traverseJsModule(curModulePath, dependencyGraph, platform);
        return {
            dependencyGraph,
            visitedModules: Array.from(this.visitedModules)
        };
    }

    __traverseJsModule(curModulePath: string, dependencyGraphNode: DependencyNode, platform: string) {
        const moduleFileContent = fs.readFileSync(curModulePath, {
            encoding: 'utf-8'
        });

        dependencyGraphNode.path = curModulePath;
        dependencyGraphNode.type = judgeJsAttributeTypeByPath(curModulePath, platform);

        // 针对 js 的 ast 遍历
        const ast = parser.parse(moduleFileContent, {
            sourceType: 'unambiguous',
            plugins: resolveBabelSyntaxPlugins(curModulePath)
        });

        traverse(ast, {
            ImportDeclaration: (path: any) => {
                const subModulePath = moduleResolver(curModulePath, path.get('source.value').node, this.visitedModules);
                // 根据路径找不到对应的真实存在的模块时
                if (!subModulePath) {
                    return;
                }

                const specifierPaths = path.get('specifiers');
                dependencyGraphNode.imports[subModulePath] = specifierPaths.map((specifierPath: any) => {
                    if (specifierPath.isImportSpecifier()) { // import { xxx, xxx } from
                        return {
                            type: IMPORT_TYPE.deconstruct,
                            imported: specifierPath.get('imported').node.name,
                            local: specifierPath.get('local').node.name
                        };
                    } else if (specifierPath.isImportDefaultSpecifier()) { // import xxx from
                        return {
                            type: IMPORT_TYPE.default,
                            local: specifierPath.get('local').node.name
                        };
                    } else { // import * as xxx from
                        return {
                            type: IMPORT_TYPE.namespace,
                            local: specifierPath.get('local').node.name
                        };
                    }
                });

                const subModule = new DependencyNode();
                this.__traverseJsModule(subModulePath, subModule, platform);
                dependencyGraphNode.subModules[subModule.path] = subModule;
            }
        });

        // 针对小程序的规范的非显式依赖遍历
        switch (dependencyGraphNode.type) {
            case JS_ATTRIBUTE_TYPE.APP: {
                break;
            }
            case JS_ATTRIBUTE_TYPE.PAGE: {
                break;
            }
        }
    }
}

export default DependencyParser;
