import webpack from 'webpack';
declare class SingleBundlePlugin {
    private launchStatus;
    apply(compiler: webpack.Compiler): void;
    execInstallSync(): Promise<unknown>;
    execBuildNoCurrentSync(): Promise<unknown>;
    setEnvStringOnCommand(originCMD: string): string;
}
export default SingleBundlePlugin;
