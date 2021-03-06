
import NanachiWebpackPlugin from '../nanachi-loader/plugin';
import SizePlugin from '../nanachi-loader/sizePlugin';
import QuickPlugin from '../nanachi-loader/quickPlugin';
import ChaikaPlugin from '../nanachi-loader/chaika-plugin/chaikaPlugin';
import CopyWebpackPlugin, {} from 'copy-webpack-plugin';
import { NanachiOptions } from '../index';
import * as path from 'path';
import webpack from 'webpack';
const utils = require('../packages/utils/index');
import { intermediateDirectoryName } from './h5/configurations';
import quickAPIList from '../consts/quickAPIList';
import config from './config';
//各种loader
//生成文件
const fileLoader = require.resolve('../nanachi-loader/loaders/fileLoader');
//处理@component, @comom
const aliasLoader = require.resolve('../nanachi-loader/loaders/aliasLoader');
//visitor
const nanachiLoader = require.resolve('../nanachi-loader/loaders/nanachiLoader');
//将第三方依赖库复制到npm目录中
const nodeLoader = require.resolve('../nanachi-loader/loaders/nodeLoader');
//处理华为快应用
const reactLoader = require.resolve('../nanachi-loader/loaders/reactLoader');

//处理 style
const nanachiStyleLoader  = require.resolve('../nanachi-loader/loaders/nanachiStyleLoader');

const cwd = process.cwd();

const H5AliasList = ['react','@react','react-dom', 'react-loadable', '@qunar-default-loading', '@dynamic-page-loader', /^@internalComponents/];

const isChaikaMode = function() {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
}

// json 配置文件名
const quickConfigFileName: string =
  config.huawei && utils.isCheckQuickConfigFileExist("quickConfig.huawei.json")
    ? "quickConfig.huawei.json"
    : "quickConfig.json";

export default function({
    platform,
    compress,
    compressOption,
    plugins,
    rules,
    huawei,
    analysis,
    typescript,
    prevLoaders, // 自定义预处理loaders
    postLoaders, // 自定义后处理loaders
    prevJsLoaders,
    postJsLoaders,
    prevCssLoaders,
    postCssLoaders,
    // maxAssetSize // 资源大小限制，超出后报warning
}: NanachiOptions): webpack.Configuration {
    let externals: Array<string|RegExp> = quickAPIList; // 编译时忽略的模块
    if (platform === 'h5') {
        externals.push(...H5AliasList);
    }

    externals.push(/runtimecommon\.js/);
    
    let aliasMap = require('../packages/utils/calculateAliasConfig')();
    let distPath = '';
    // chaika 模式下要打包到yourProject/dist中
    if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
        distPath = path.resolve(cwd, '../../' ,utils.getDistName(platform));
    } else {
        distPath = path.resolve(cwd, utils.getDistName(platform));
    }
    
    if (platform === 'h5') {
        distPath = path.join(distPath, intermediateDirectoryName);
    }

    let copyPluginOption: any = null;
    if (compress) {
        const compressImage = require(path.resolve(cwd, 'node_modules', 'nanachi-compress-loader/utils/compressImage.js'));
        copyPluginOption = {
            transform(content: string, path: string) {
                const type = path.replace(/.*\.(.*)$/, '$1');
                return compressImage(content, type, compressOption);
            },
            cache: true,
        };
    }

    // node_modules pkg
    const nodeRules = [{
        test: /node_modules[\\/](?!schnee-ui[\\/])/,
        use: [].concat(
            fileLoader, 
            postLoaders, 
            aliasLoader, 
            nodeLoader) 
    }];
    const copyAssetsRules = [{
        from: '**',
        to: 'assets',
        context: 'source/assets',
        ignore: [
            '**/*.@(js|jsx|json|sass|scss|less|css|ts|tsx)'
        ],
        ...copyPluginOption // 压缩图片配置
    }];
    
    const mergePlugins = [].concat( 
        isChaikaMode() ? [ new ChaikaPlugin() ] : [],
        analysis ? new SizePlugin() : [],
        new NanachiWebpackPlugin({
            platform,
            compress
        }),
        new CopyWebpackPlugin(copyAssetsRules),
        plugins);

    const mergeRule = [].concat(
        {
            test: /\.[jt]sx?$/,
            //loader是从后往前处理
            use: [].concat(
                fileLoader, 
                postLoaders, 
                postJsLoaders,
                platform !== 'h5' ? aliasLoader: [], 
                nanachiLoader,
                {
                    loader: require.resolve('eslint-loader'),
                    options: {
                        configFile: require.resolve(`./eslint/.eslintrc-${platform}.js`),
                        failOnError: utils.isMportalEnv(),
                        allowInlineConfig: false, // 不允许使用注释配置eslint规则
                        useEslintrc: false // 不使用用户自定义eslintrc配置
                    }
                },
                typescript ? {
                    loader: require.resolve('ts-loader'),
                    options: {
                        context: path.resolve(cwd)
                    }
                } : [],
                prevJsLoaders,
                prevLoaders ) ,
            exclude: /node_modules[\\/](?!schnee-ui[\\/])|React/,
        },
        platform !== 'h5' ? nodeRules : [],
        {
            test: /React\w+/,
            use: [].concat(
                fileLoader, 
                postLoaders,
                nodeLoader, 
                reactLoader)
        },
        {
            test: /\.(s[ca]ss|less|css)$/,
            use: [].concat(
                fileLoader, 
                postLoaders, 
                postCssLoaders,
                platform !== 'h5' ? aliasLoader : [], 
                nanachiStyleLoader,
                prevCssLoaders,
                prevLoaders)
        },
        {
            test: /\.(jpg|png|gif)$/,
            loader: require.resolve('file-loader'),
            options: {
                outputPath: 'assets',
                name: '[name].[hash:10].[ext]'
            }
        },
        rules);
    
    if (platform === 'quick') {
        mergePlugins.push(new QuickPlugin());
        // quickConfig可能不存在 需要try catch
        try {
             // quickConfig可能不存在 需要try catch
             var quickConfig: {
                 widgets?: Array<{
                     path?: string
                 }>;
                 router?: {
                     widgets?: any;
                 }
             } = {};
             quickConfig = require(path.join(
                cwd,
                "source",
                quickConfigFileName
             ))
            if (huawei) {
                if (quickConfig && quickConfig.widgets) {
                    quickConfig.widgets.forEach(widget => {
                        const widgetPath = widget.path;
                        if (widgetPath) {
                            const rule = {
                                from: '**',
                                to: widgetPath.replace(/^[\\/]/, ''),
                                context: path.join('source', widgetPath),
                                ...copyPluginOption
                            };
                            copyAssetsRules.push(rule);
                        }
                    });
                }
            } else if (quickConfig && quickConfig.router && quickConfig.router.widgets) {
        
                Object.keys(quickConfig.router.widgets).forEach(key => {
                    const widgetPath = quickConfig.router.widgets[key].path;
                    if (widgetPath) {
                        const rule = {
                            from: '**',
                            to: widgetPath.replace(/^[\\/]/, ''),
                            context: path.join('source', widgetPath),
                            ...copyPluginOption
                        };
                        copyAssetsRules.push(rule);
                    }
                });
            }
        } catch (err) {
            // eslint-disable-next-line
        }
    }

    if (platform === 'h5') {
        // 防止目录里面有些乱七八糟的文件
        mergePlugins.push(
            new webpack.IgnorePlugin({
                resourceRegExp: /\.(\w?ux|pem)$/,
            })
        )
    }

    let entry = path.join(cwd, 'source/app');

    if (typescript) { entry += '.tsx' };
    return {
        entry: entry,
        mode: 'development',
        output: {
            path: distPath,
            filename: 'index.bundle.js'
        },
        module: {
            rules: mergeRule
        },
        plugins: mergePlugins,
        resolve: {
            alias: aliasMap,
            extensions: [
                '.js', '.jsx', '.json', '.ts', '.tsx'
            ],
            mainFields: ['main'],
            symlinks: false, // chaika里node_modules需要解析成Project/.CACHE/nanachi/node_modules的symlink路径，而不是真实路径Project/node_modules
            modules: [
                path.join(process.cwd(), 'node_modules')
            ]
        },
        watchOptions: {
            ignored: /dist/
        },
        externals
        // performance: {
        //     hints: 'warning',
        //     assetFilter(filename) {
        //         return !/React\w+\.js/.test(filename);
        //     },
        //     maxAssetSize
        // }
    };
};
