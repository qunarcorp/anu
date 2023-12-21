import { ConfigResolver, configOptionsType } from './configResolver';
import { DependencyNode } from './const';
declare class DependencyParser {
    config: ConfigResolver;
    visitedModules: Set<string>;
    constructor(options: configOptionsType);
    parse(): void;
    treeShaking(): void;
    __clearVisitedModules(): void;
    __traverseModule(curModulePath: string, platform: string): {
        dependencyGraph: DependencyNode;
        visitedModules: string[];
    };
    __traverseJsModule(curModulePath: string, dependencyGraphNode: DependencyNode, platform: string): void;
}
export default DependencyParser;
