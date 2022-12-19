import webpack = require('webpack');
import webpackV5 = require('webpack-new');
declare function createH5Server(compiler: webpack.Compiler): Promise<void>;
declare function createH5ServerV5(compiler: webpackV5.Compiler): Promise<void>;
export { createH5Server, createH5ServerV5, };
