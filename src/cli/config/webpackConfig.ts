import NanachiWebpackPlugin from '../nanachi-loader/plugin';
import SizePlugin from '../nanachi-loader/sizePlugin';
import QuickPlugin from '../nanachi-loader/quickPlugin';
import ChaikaPlugin from '../nanachi-loader/chaika-plugin/chaikaPlugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import IgnoreDependencyErrorsPlugin from '../nanachi-loader/ignoreDependencyErrorsPlugin';
import {NanachiOptions} from '../index';
import * as path from 'path';
import * as fs from 'fs';
import webpack from 'webpack';
import {intermediateDirectoryName} from './h5/configurations';
import quickAPIList from '../consts/quickAPIList';
import config from './config';
import glob from 'glob';

const { exec } = require('child_process');
const utils = require('../packages/utils/index');
//各种loader
//生成文件
const fileLoader = require.resolve('../nanachi-loader/loaders/fileLoader');
//处理@component, @common
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

const WebpackBar = require('webpackbar');
// json 配置文件名
const quickConfigFileName: string =
  config.huawei && utils.isCheckQuickConfigFileExist('quickConfig.huawei.json')
      ? 'quickConfig.huawei.json'
      : 'quickConfig.json';

global.nanachiVersion = config.nanachiVersion || '';

/**
 * 收集标记为 main 和 common 的包的全部内含 js 文件路径
 * 收集的目的是为了处理单包打包流程中部分只有在子包中引入的文件，而仅仅打包主包和公共包的情况下，这部分代码不会参与打包和合并
 * 因此现在的流程保证主包和公共包中的所有文件都会被打包，无论是否当前的代码中是否被入口扫描到
 */
function collectAllJsInMainAndCommonPackages() : string[] {
    // 单包模式下，不需要收集所有主包依赖，直接启动的 build or watch 流程也不需要收集
    // noCurrent 只会在通过 watch -c 中启动的 build 流程上设置，因此基本确定了只有子进程的打包才会采集所有主包依赖
    if (utils.isSingleBundle() && config.noCurrent === false) return [];

    // TODO: 目前是根据包名判断，未来需要跟 cli 入口那里一样，针对包做命名
    const judgeNames = ['nnc_module_qunar_platform']; // 不包含 main 包，避免原始的入口 app.js 重复被加入还得去重
    const judgeDirName = ['components', 'common']; // 理论上，只需要针对主包这两个文件夹做扫描

    // 获取下载缓存区中的特定包的地址
    const needScanOriginalDir: string[] = [];
    judgeNames.forEach((name) => {
        const target = config.projectSourceTypeList.find(el => el.name === name);
        if (target) {
            needScanOriginalDir.push(target.path);
        } else {
            console.error(`[collectAllJsInMainAndCommonPackages] 未找到 ${name} 对应在下载缓存区中的地址，无法进行后续流程，请联系 nanachi 开发者`);
            process.exit(1);
        }
    });

    // 获取 needScanOriginalDir 中每个路径的 ./source/{judgeDirName} 的所有以 .js .ts 结尾的文件
    const needScanOriginalJsFiles: { [key: string]: string[] } = {};
    needScanOriginalDir.forEach((el) => {
        needScanOriginalJsFiles[el] = [];
        judgeDirName.forEach((name) => {
            const judgeFullPath = path.join(el, 'source', name);
            // 通过 glob 搜索所有目录下以及嵌套目录下 .js 文件或者 .ts 文件，然后加入到 needScanOriginalJsFiles 中
            const files = glob.sync(path.join(judgeFullPath, '/**/*.@(js|ts)'), {nodir: true});
            needScanOriginalJsFiles[el].push(...files);
        });
    });

    // 将待加入的路径转换为合并后打包目录中的路径
    const needAddedExtraEntryList: string[] = [];
    Object.keys(needScanOriginalJsFiles).forEach((key) => {
        needScanOriginalJsFiles[key].forEach((p) => {
            const relativePath = path.relative(key, p);
            needAddedExtraEntryList.push(path.join(cwd, relativePath));
        });
    });

    return needAddedExtraEntryList;
}

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
    // chaika 模式下要打包到yourProject/dist中
    // if (process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE') {
    //     distPath = path.resolve(cwd, '../../' , utils.getDistName(platform));
    // } else {
    //     distPath = path.resolve(cwd, utils.getDistName(platform));
    // }
    let distPath = path.resolve(utils.getDistDir());
    // console.log('distPath', distPath);

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
        // chaikaPlugin 改为各种情况下一定会加载的插件，在插件内部判断逻辑
        [ new ChaikaPlugin() ],
        analysis ? new SizePlugin() : [],
        new NanachiWebpackPlugin({
            platform,
            compress
        }),
        new CopyWebpackPlugin(copyAssetsRules),
        new IgnoreDependencyErrorsPlugin(),
        plugins);


    const { skipNanachiCache = false, JENKINS_URL = '' } = process.env;
    const BUILD_ENV = process.env.BUILD_ENV || '';
    const jenkinsPath = '/usr/local/q/npm';
    const basePath = fs.existsSync(jenkinsPath) ? path.join(jenkinsPath) : path.join(process.cwd(),'../../');
    const cachePath = `.qcache/nanachi-cache-loader/${BUILD_ENV}/${platform}`;
    const cacheDirectory = path.resolve(path.join(basePath,cachePath));



    /**
     * 1 - watch模式不开启缓存；
     * 2 - 环境变量 skipNanachiCache = false不开启缓存；
     * 3 - 非微信平台不开启缓存
     * 4 - 没有 BUILD_ENV（编译环境不缓存）
     * **/
    const useCache = !watch && !JSON.parse(skipNanachiCache) && platform == 'wx' && !!BUILD_ENV;
    if (JENKINS_URL) {
        console.log(` watch模式是否开启: ${watch} \n 环境变量skipNanachiCache是否开启缓存: ${JSON.parse(skipNanachiCache)} \n 是否微信平台: ${platform == 'wx'} \n 有无BUILD_ENV: ${!!BUILD_ENV}`);
        console.log(`\n\n本次构建是否要走缓存：${useCache}`);
    }
    if (!useCache) { // 这个删除是在编译之前执行的，时间长了会忘记这个顺序（以为程序出了问题，为啥internal没有被删除，第一次编译会生成internal，第二次编译检测internal有没有生成，如果有走缓存没有删除没用的缓存避免缓存错乱）
        exec(`rm -rf ${cacheDirectory}`, (err, stdout, stderr) => {});
    }

    const cacheLorder =  {
        loader: require.resolve('cache-loader-hash'),
        options: {
            mode:'hash',
            cacheDirectory: cacheDirectory,
            // cache校验需要目前加入自己定义的一些会改变变异产物的变量
            cacheIdentifier: `cache-loader:${BUILD_ENV}-${process.env.NODE_ENV}-${process.env.SKIP}`, // 重新设置缓存，防止 skip 改变还走缓存
        }
    };

    const jsLorder  = () => {
        return [].concat(
            fileLoader,
            platform !== 'h5' ? aliasLoader : [],
            // useCache ? cacheLorder : [],
            postLoaders,
            postJsLoaders,
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
            prevLoaders,
        );
    };

    function isJsFile(sourcePath: string) {
        return /\.[jt]sx?$/.test(sourcePath);
    }

    function isNpmFile(sourcePath: string) {
        return /\/node_modules\//.test(sourcePath);
    }

    function isPatchUiComponentsFile(sourcePath: string) {
        return /\/node_modules\/schnee-ui\//.test(sourcePath);
    }

    function isThirdNpmUiComponentsFile(sourcePath: string) {
        return /\/node_modules\/.+\/components\//.test(sourcePath);
    }

    function isReactFile(sourcePath: string) {
        return /\/React\w+\.js$/.test(sourcePath);
    }

    const nodeRules = [{
        // test: /node_modules[\\/](?!schnee-ui[\\/])/,
        test: function(sourcePath: string) {
            return isNpmFile(sourcePath) && !isThirdNpmUiComponentsFile(sourcePath);
        },
        use: [].concat(
            fileLoader,
            postLoaders,
            aliasLoader,
            nodeLoader
        )
    }];

    const mergeRule = [].concat(
        {
            //test: /\.[jt]sx?$/,
            test: function(sourcePath: string) {
                if (isJsFile(sourcePath)) {
                    if (isNpmFile(sourcePath)) {
                        if (isPatchUiComponentsFile(sourcePath)) {
                            return true;
                        } else if (isThirdNpmUiComponentsFile(sourcePath)) {
                            return true;
                        } else {
                            return false;
                        }
                    } else if (isReactFile(sourcePath)) {
                        return false;
                    } {
                        return true;
                    }
                } else {
                    return false;
                }
            },
            //loader是从后往前处理
            use: jsLorder(),
            // exclude: /node_modules[\\/](?!schnee-ui[\\/])|React/,
        },
        platform !== 'h5' ? nodeRules : [],
        {
            test: /React\w+/,
            use: [].concat(
                fileLoader,
                // useCache ? cacheLorder : [],
                postLoaders,
                nodeLoader,
                reactLoader
            )
        },
        {
            test: /\.(s[ca]ss|less|css)$/,
            use: [].concat(
                fileLoader,
                platform !== 'h5' ? aliasLoader : [],
                // useCache ? cacheLorder : [],
                postLoaders,
                postCssLoaders,
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
        try {
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
                'source',
                quickConfigFileName
            ));
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
        );
    }

    const extraIslandJsFileList = collectAllJsInMainAndCommonPackages();
    // console.log('extraIslandJsFileList', extraIslandJsFileList);

    // 单包模式下使用生成的 shadowApp.js 作为入口
    let entry = utils.isSingleBundle() ? utils.getShadowAppJsPath() : [path.join(cwd, 'source/app'), ...extraIslandJsFileList];

    if (typescript) { entry += '.tsx'; }
    const barNameMap = {
        quick: '快应用',
        wx: '微信小程序',
        ali: '支付宝小程序',
        bu: '百度小程序',
        qq: 'QQ小程序',
        tt: '头条小程序',
        h5: 'H5'
    };
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
            new WebpackBar({
                name: 'Webpack: '+ barNameMap[platform],
                reporter: {
                    change(ctx, changedFileInfo) {
                        console.log('changedFileInfo:', changedFileInfo);
                        // Called when compile finished
                        ctx.options.reporters = [];
                        return '';
                    },
                }
            }),
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
            // ignored: [
            //     /dist/,
            //     /node_modules/,
            //     /\.CACHE/
            // ]
            // 加入忽略本地的文件 xxShadowApp.js xx代表任意长度的字符串
            ignored: [
                /dist/,
                /.*ShadowApp\.js/,
                /sourcemap/,
                /.CACHE/
            ]
            // ignored: [/dist/, ]
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
}
