import webpack from 'webpack';
declare class CleanShadowAppJsPlugin {
    constructor(options: {
        pathsToDelete: string[];
    });
    apply(compiler: webpack.Compiler): void;
    cleanSourceCode(): void;
}
export default CleanShadowAppJsPlugin;
