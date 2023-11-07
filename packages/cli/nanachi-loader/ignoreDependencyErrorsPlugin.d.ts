import webpack from 'webpack';
declare class IgnoreDependencyErrorsPlugin {
    apply(compiler: webpack.Compiler): void;
}
export default IgnoreDependencyErrorsPlugin;
