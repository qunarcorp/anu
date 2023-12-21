declare function resolveBabelSyntaxPlugins(modulePath: string): string[];
declare function moduleResolver(curModulePath: string, requirePath: string, visitedModules: Set<string>): string;
export { moduleResolver, resolveBabelSyntaxPlugins };
