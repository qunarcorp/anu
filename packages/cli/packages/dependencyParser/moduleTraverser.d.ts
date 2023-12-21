declare class DependencyNode {
    path: any;
    imports: any;
    type: any;
    subModules: any;
    constructor(path?: string, imports?: {});
}
declare const traverseModule: (curModulePath: string, platform: string) => {
    dependencyGraph: DependencyNode;
    visitedModules: string[];
};
export default traverseModule;
