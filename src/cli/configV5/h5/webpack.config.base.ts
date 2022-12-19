import webpack from 'webpack-new';
const HtmlWebpackPlugin = require('html-webpack-plugin-new');
// const CleanWebpackPlugin = require('clean-webpack-plugin');
import * as path from'path';
import R from 'ramda';

import {
    intermediateDirectoryName,
    outputDirectory,
    retrieveNanachiConfig
} from './configurations';

import * as fs from 'fs-extra';

const context = path.resolve(process.cwd(), 'dist');
const h5helperPath = path.resolve(process.cwd(), `node_modules/schnee-ui/h5`);
const resolveFromContext = R.curryN(2, path.resolve)(context);
const resolveFromDirCwd = R.curryN(2, path.resolve)(process.cwd());
const resolveFromH5Helper = R.curryN(2, path.resolve)(h5helperPath);
const REACT_H5 = resolveFromDirCwd('./source/ReactH5.js');

let templatePath = path.resolve(__dirname, '../../packages/h5Helpers/index.html');
try {
    const userTemplatePath = resolveFromDirCwd('./index.html');
    fs.statSync(userTemplatePath);
    templatePath = userTemplatePath;
} catch (e) {
    // 用户根目录不存在模板html文件则用默认模板
}

const plugins = [
    new HtmlWebpackPlugin({
        template: templatePath
    }),
    new webpack.EnvironmentPlugin({
        ANU_ENV: 'web',
        ...process.env
    }),
    // new CleanWebpackPlugin()
]

const webpackConfig: webpack.Configuration = {
    mode: 'development',
    context,
    target: 'web',
    entry: resolveFromContext(`${intermediateDirectoryName}/app`),
    output: {
        path: resolveFromDirCwd(outputDirectory),
        filename: 'bundle.[hash:10].js',
        publicPath: '/web/'
    },
    resolve: {
        alias: {
            ...retrieveNanachiConfig(),
            react: REACT_H5,
            '@react': REACT_H5,
            'react-dom': REACT_H5,
            'schnee-ui': resolveFromContext(`${intermediateDirectoryName}/npm/schnee-ui`),
            '@internalComponents': resolveFromH5Helper('components'),
            '@internalConsts': path.resolve(__dirname, '../../consts/'),
            '@components': resolveFromContext(
                `${intermediateDirectoryName}/components`
            ),
            // '@pageConfig': resolveFromContext(`${intermediateDirectoryName}/pageConfig.js`),
            '@qunar-default-loading': resolveFromH5Helper('components/Loading'),
        },
        modules: ['node_modules', path.resolve(__dirname, '../../node_modules'), resolveFromDirCwd('node_modules')],
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx']
    },
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                use: [
                    require.resolve('style-loader'),
                    require.resolve('css-loader'),
                    {
                        loader: require.resolve('postcss-sass-loader'),
                        options: {
                            plugin: []
                        }
                    }
                ]
            },
            {
                test: /\.(le|c)ss$/,
                use: [
                    require.resolve('style-loader'),
                    require.resolve('css-loader'),
                    {
                        loader: require.resolve('postcss-less-loader'),
                        options: {
                            plugin: []
                        }
                    }
                ]
            },
            {
                test: /\.(jpg|png|gif)$/,
                loader: require.resolve('file-loader'),
                options: {
                    outputPath: 'assets',
                    name: '[name].[hash:10].[ext]'
                }
            }
        ]
    },
    devtool: 'cheap-source-map',
    plugins,
    stats: 'errors-only'
}

export default webpackConfig;
