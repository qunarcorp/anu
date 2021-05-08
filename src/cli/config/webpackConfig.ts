
import NanachiWebpackPlugin from '../nanachi-loader/plugin';
import SizePlugin from '../nanachi-loader/sizePlugin';
import QuickPlugin from '../nanachi-loader/quickPlugin';
import ChaikaPlugin from '../nanachi-loader/chaika-plugin/chaikaPlugin';
import CopyWebpackPlugin, {} from 'copy-webpack-plugin';


import { NanachiOptions } from '../index';
import * as path from 'path';
import * as fs from 'fs';
const { exec } = require('child_process');
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


const WebpackBar = require('webpackbar');
// json 配置文件名
const quickConfigFileName: string =
  config.huawei && utils.isCheckQuickConfigFileExist("quickConfig.huawei.json")
    ? "quickConfig.huawei.json"
    : "quickConfig.json";

global.nanachiVersion = config.nanachiVersion || '';

export default function({
    watch,
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


    const { skipNanachiCache = true, JENKINS_URL = '' } = process.env
    const BUILD_ENV = process.env.BUILD_ENV || ''
    const jenkinsPath = '/usr/local/q/npm'
    const basePath = fs.existsSync(jenkinsPath) ? path.join(jenkinsPath) : path.join(process.cwd(),'../../')
    const cachePath = `.qcache/nanachi-cache-loader/${BUILD_ENV}/${platform}`;
    const cacheDirectory = path.resolve(path.join(basePath,cachePath));
   
    
   
    /**
     * 1 - watch模式不开启缓存；
     * 2 - 环境变量 skipNanachiCache = false不开启缓存；
     * 3 - 非微信平台不开启缓存
     * 4 - 没有 BUILD_ENV（编译环境不缓存）
     * **/ 
    const useCache = !watch && JSON.parse(skipNanachiCache) && platform == 'wx' && !!BUILD_ENV
    if(!!JENKINS_URL) {
        console.log(` watch模式是否开启: ${watch} \n 环境变量skipNanachiCache是否开启缓存: ${JSON.parse(skipNanachiCache)} \n 是否微信平台: ${platform == 'wx'} \n 有无BUILD_ENV: ${!!BUILD_ENV}`);
        console.log(`\n\n本次构建是否要走缓存：${useCache}`)
    }
    if(!useCache) { // 这个删除是在编译之前执行的，时间长了会忘记这个顺序（以为程序出了问题，为啥internal没有被删除，第一次编译会生成internal，第二次编译检测internal有没有生成，如果有走缓存没有删除没用的缓存避免缓存错乱）
        exec(`rm -rf ${cacheDirectory}`, (err, stdout, stderr) => {});
    } 
    
    const cacheLorder =  {
        loader: require.resolve("cache-loader-hash"),
        options: {
            mode:'hash',
            cacheDirectory: cacheDirectory,
        }
    }

    const jsLorder  = () => {
        const __jsLorder = [].concat(
            fileLoader, 
            useCache ? cacheLorder : [],
            postLoaders, 
            postJsLoaders,
            platform !== 'h5' ? aliasLoader: [], 
            nanachiLoader,
            // {
            //     loader: require.resolve('eslint-loader'),
            //     options: {
            //         configFile: require.resolve(`./eslint/.eslintrc-${platform}.js`),
            //         failOnError: utils.isMportalEnv(),
            //         allowInlineConfig: false, // 不允许使用注释配置eslint规则
            //         useEslintrc: false // 不使用用户自定义eslintrc配置
            //     }
            // },
            typescript ? {
                loader: require.resolve('ts-loader'),
                options: {
                    context: path.resolve(cwd)
                }
            } : [],
            prevJsLoaders,
            prevLoaders )
        return __jsLorder
    };

    const mergeRule = [].concat(
        {
            test: /\.[jt]sx?$/,
            //loader是从后往前处理
            use:  jsLorder() ,
            exclude: /node_modules[\\/](?!schnee-ui[\\/])|React/,
        },
        platform !== 'h5' ? nodeRules : [],
        {
            test: /React\w+/,
            use: [].concat(
                fileLoader, 
                useCache ? cacheLorder : [],
                postLoaders,
                nodeLoader, 
                reactLoader)
        },
        {
            test: /\.(s[ca]ss|less|css)$/,
            use: [].concat(
                fileLoader, 
                useCache ? cacheLorder : [],
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
        plugins: [
            new WebpackBar(),
            ...mergePlugins
        ],
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