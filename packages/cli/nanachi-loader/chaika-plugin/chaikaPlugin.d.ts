import webpack from 'webpack';
declare class ChaikaPlugin {
    private envStringWhiteList;
    apply(compiler: webpack.Compiler): void;
    execInstallSync(): Promise<unknown>;
    execBuildNoCurrentSync(): Promise<unknown>;
    setEnvStringOnCommand(originCMD: string): string;
    deleteUnnecessaryXConfigInDist(): void;
    addImportSyntaxToAppJs(waitedMergeProjectDirList: any): void;
}
export default ChaikaPlugin;
