import webpackDevServer from 'webpack-dev-server';
import webpackDevServerV5 from 'webpack-dev-server-new';
import webpack = require('webpack');
import webpackV5 = require('webpack-new');
import getPort from 'get-port';
import webpackH5Config from '../config/h5/webpack.config';
import webpackH5ConfigV5 from '../configV5/h5/webpack.config';
let app: webpackDevServer;
let appV5: webpackDevServerV5;
const PORT = 8080;

async function createH5Server(compiler: webpack.Compiler) {
    if (!app) {
        const port = await getPort({
            port: PORT
        });
        app = new webpackDevServer(compiler, {
            publicPath: webpackH5Config.output.publicPath,
            host: '0.0.0.0',
            port,
            historyApiFallback: {
                rewrites: [{
                    from: /.*/g,
                    to: '/web/'
                }]
            },
            disableHostCheck: true,
            // noInfo: true,
            // https: true, // TODO做成配置项
            hot: true,
            stats: 'errors-only',
            overlay: true,
            watchOptions: {
                poll: 500
            }
        });
        app.listen(port);
    }
};

async function createH5ServerV5(compiler: webpackV5.Compiler) {
    if (!appV5) {
        const port = await getPort({
            port: PORT
        });
        appV5 = new webpackDevServerV5(compiler, {
            publicPath: webpackH5ConfigV5.output.publicPath,
            host: '0.0.0.0',
            port,
            historyApiFallback: {
                rewrites: [{
                    from: /.*/g,
                    to: '/web/'
                }]
            },
            disableHostCheck: true,
            // noInfo: true,
            // https: true, // TODO做成配置项
            hot: true,
            stats: 'errors-only',
            overlay: true,
            watchOptions: {
                poll: 500
            }
        });
        await appV5.start();
    }
};

export {
    createH5Server,
    createH5ServerV5,
}