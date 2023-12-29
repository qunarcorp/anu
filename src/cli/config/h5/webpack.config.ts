import developmentConfig from './webpack.config.base';
import * as path from 'path';
import merge from 'webpack-merge';
import webpack = require('webpack');
const utils = require('../../packages/utils/index');
const projectRootPath = utils.getProjectRootPath();

const pageWrapper: string = path.resolve(process.cwd(), "node_modules/schnee-ui/h5/components/pageWrapper");

const config: webpack.Configuration = merge(developmentConfig, {
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.[jt]sx?$/,
                loader: require.resolve('babel-loader'),
                options: {
                    cacheDirectory: true,
                    root: pageWrapper,
                    plugins: [
                        require.resolve('@babel/plugin-transform-runtime'),
                        require.resolve('@babel/plugin-syntax-dynamic-import'),
                        require.resolve('@babel/plugin-proposal-object-rest-spread'),
                        [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
                        [require.resolve('@babel/plugin-proposal-class-properties')],
                    ],
                    presets: [
                        require.resolve('@babel/preset-react'),
                    ]
                }
            },
            {
                test: /\.[jt]sx?$/,
                loader: require.resolve('babel-loader'),
                exclude: [/node_modules/],
                options: {
                    plugins: [
                        require.resolve('@babel/plugin-transform-runtime'),
                        require.resolve('@babel/plugin-syntax-dynamic-import'),
                        require.resolve('@babel/plugin-proposal-object-rest-spread'),
                        [require.resolve('@babel/plugin-proposal-decorators'), { legacy: true }],
                        [require.resolve('@babel/plugin-proposal-class-properties')],
                    ],
                    presets: [require.resolve('@babel/preset-react')]
                }
            }
        ]
    },
    optimization: {
        noEmitOnErrors: true
    },
    performance: {
        hints: false
    }
})

export default config;
module.exports = config;
