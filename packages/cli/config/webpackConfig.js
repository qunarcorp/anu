"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = __importDefault(require("../nanachi-loader/plugin"));
const sizePlugin_1 = __importDefault(require("../nanachi-loader/sizePlugin"));
const quickPlugin_1 = __importDefault(require("../nanachi-loader/quickPlugin"));
const chaikaPlugin_1 = __importDefault(require("../nanachi-loader/chaika-plugin/chaikaPlugin"));
const copy_webpack_plugin_1 = __importDefault(require("copy-webpack-plugin"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const { exec } = require('child_process');
const webpack_1 = __importDefault(require("webpack"));
const utils = require('../packages/utils/index');
const configurations_1 = require("./h5/configurations");
const quickAPIList_1 = __importDefault(require("../consts/quickAPIList"));
const config_1 = __importDefault(require("./config"));
const fileLoader = require.resolve('../nanachi-loader/loaders/fileLoader');
const aliasLoader = require.resolve('../nanachi-loader/loaders/aliasLoader');
const nanachiLoader = require.resolve('../nanachi-loader/loaders/nanachiLoader');
const nodeLoader = require.resolve('../nanachi-loader/loaders/nodeLoader');
const reactLoader = require.resolve('../nanachi-loader/loaders/reactLoader');
const nanachiStyleLoader = require.resolve('../nanachi-loader/loaders/nanachiStyleLoader');
const cwd = process.cwd();
const H5AliasList = ['react', '@react', 'react-dom', 'react-loadable', '@qunar-default-loading', '@dynamic-page-loader', /^@internalComponents/];
const isChaikaMode = function () {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
};
const WebpackBar = require('webpackbar');
const quickConfigFileName = config_1.default.huawei && utils.isCheckQuickConfigFileExist("quickConfig.huawei.json")
    ? "quickConfig.huawei.json"
    : "quickConfig.json";
global.nanachiVersion = config_1.default.nanachiVersion || '';
function default_1({ watch, platform, compress, compressOption, plugins, rules, huawei, analysis, typescript, prevLoaders, postLoaders, prevJsLoaders, postJsLoaders, prevCssLoaders, postCssLoaders, }) {
    let externals = quickAPIList_1.default;
    if (platform === 'h5') {
        externals.push(...H5AliasList);
    }
    externals.push(/runtimecommon\.js/);
    let aliasMap = require('../packages/utils/calculateAliasConfig')();
    let distPath = path.resolve(utils.getDistDir());
    if (platform === 'h5') {
        distPath = path.join(distPath, configurations_1.intermediateDirectoryName);
    }
    let copyPluginOption = null;
    if (compress) {
        const compressImage = require(path.resolve(cwd, 'node_modules', 'nanachi-compress-loader/utils/compressImage.js'));
        copyPluginOption = {
            transform(content, path) {
                const type = path.replace(/.*\.(.*)$/, '$1');
                return compressImage(content, type, compressOption);
            },
            cache: true,
        };
    }
    const copyAssetsRules = [Object.assign({ from: '**', to: 'assets', context: 'source/assets', ignore: [
                '**/*.@(js|jsx|json|sass|scss|less|css|ts|tsx)'
            ] }, copyPluginOption)];
    const mergePlugins = [].concat(isChaikaMode() ? [new chaikaPlugin_1.default()] : [], analysis ? new sizePlugin_1.default() : [], new plugin_1.default({
        platform,
        compress
    }), new copy_webpack_plugin_1.default(copyAssetsRules), plugins);
    const { skipNanachiCache = false, JENKINS_URL = '' } = process.env;
    const BUILD_ENV = process.env.BUILD_ENV || '';
    const jenkinsPath = '/usr/local/q/npm';
    const basePath = fs.existsSync(jenkinsPath) ? path.join(jenkinsPath) : path.join(process.cwd(), '../../');
    const cachePath = `.qcache/nanachi-cache-loader/${BUILD_ENV}/${platform}`;
    const cacheDirectory = path.resolve(path.join(basePath, cachePath));
    const useCache = !watch && !JSON.parse(skipNanachiCache) && platform == 'wx' && !!BUILD_ENV;
    if (!!JENKINS_URL) {
        console.log(` watch模式是否开启: ${watch} \n 环境变量skipNanachiCache是否开启缓存: ${JSON.parse(skipNanachiCache)} \n 是否微信平台: ${platform == 'wx'} \n 有无BUILD_ENV: ${!!BUILD_ENV}`);
        console.log(`\n\n本次构建是否要走缓存：${useCache}`);
    }
    if (!useCache) {
        exec(`rm -rf ${cacheDirectory}`, (err, stdout, stderr) => { });
    }
    const cacheLorder = {
        loader: require.resolve("cache-loader-hash"),
        options: {
            mode: 'hash',
            cacheDirectory: cacheDirectory,
        }
    };
    const jsLorder = () => {
        const __jsLorder = [].concat(fileLoader, platform !== 'h5' ? aliasLoader : [], useCache ? cacheLorder : [], postLoaders, postJsLoaders, nanachiLoader, typescript ? {
            loader: require.resolve('ts-loader'),
            options: {
                context: path.resolve(cwd)
            }
        } : [], prevJsLoaders, prevLoaders);
        return __jsLorder;
    };
    function isJsFile(sourcePath) {
        return /\.[jt]sx?$/.test(sourcePath);
    }
    function isNpmFile(sourcePath) {
        return /\/node_modules\//.test(sourcePath);
    }
    function isPatchUiComponentsFile(sourcePath) {
        return /\/node_modules\/schnee-ui\//.test(sourcePath);
    }
    function isThirdNpmUiComponentsFile(sourcePath) {
        return /\/node_modules\/.+\/components\//.test(sourcePath);
    }
    function isReactFile(sourcePath) {
        return /\/React\w+\.js$/.test(sourcePath);
    }
    const nodeRules = [{
            test: function (sourcePath) {
                return isNpmFile(sourcePath) && !isThirdNpmUiComponentsFile(sourcePath);
            },
            use: [].concat(fileLoader, postLoaders, aliasLoader, nodeLoader)
        }];
    const mergeRule = [].concat({
        test: function (sourcePath) {
            if (isJsFile(sourcePath)) {
                if (isNpmFile(sourcePath)) {
                    if (isPatchUiComponentsFile(sourcePath)) {
                        return true;
                    }
                    else if (isThirdNpmUiComponentsFile(sourcePath)) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else if (isReactFile(sourcePath)) {
                    return false;
                }
                {
                    return true;
                }
            }
            else {
                return false;
            }
        },
        use: jsLorder(),
    }, platform !== 'h5' ? nodeRules : [], {
        test: /React\w+/,
        use: [].concat(fileLoader, useCache ? cacheLorder : [], postLoaders, nodeLoader, reactLoader)
    }, {
        test: /\.(s[ca]ss|less|css)$/,
        use: [].concat(fileLoader, platform !== 'h5' ? aliasLoader : [], useCache ? cacheLorder : [], postLoaders, postCssLoaders, nanachiStyleLoader, prevCssLoaders, prevLoaders)
    }, {
        test: /\.(jpg|png|gif)$/,
        loader: require.resolve('file-loader'),
        options: {
            outputPath: 'assets',
            name: '[name].[hash:10].[ext]'
        }
    }, rules);
    if (platform === 'quick') {
        mergePlugins.push(new quickPlugin_1.default());
        try {
            var quickConfig = {};
            quickConfig = require(path.join(cwd, "source", quickConfigFileName));
            if (huawei) {
                if (quickConfig && quickConfig.widgets) {
                    quickConfig.widgets.forEach(widget => {
                        const widgetPath = widget.path;
                        if (widgetPath) {
                            const rule = Object.assign({ from: '**', to: widgetPath.replace(/^[\\/]/, ''), context: path.join('source', widgetPath) }, copyPluginOption);
                            copyAssetsRules.push(rule);
                        }
                    });
                }
            }
            else if (quickConfig && quickConfig.router && quickConfig.router.widgets) {
                Object.keys(quickConfig.router.widgets).forEach(key => {
                    const widgetPath = quickConfig.router.widgets[key].path;
                    if (widgetPath) {
                        const rule = Object.assign({ from: '**', to: widgetPath.replace(/^[\\/]/, ''), context: path.join('source', widgetPath) }, copyPluginOption);
                        copyAssetsRules.push(rule);
                    }
                });
            }
        }
        catch (err) {
        }
    }
    if (platform === 'h5') {
        mergePlugins.push(new webpack_1.default.IgnorePlugin({
            resourceRegExp: /\.(\w?ux|pem)$/,
        }));
    }
    let entry = path.join(cwd, 'source/app');
    if (typescript) {
        entry += '.tsx';
    }
    ;
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
                name: 'Webpack: ' + barNameMap[platform],
                reporter: {
                    change(ctx, changedFileInfo) {
                        console.log('changedFileInfo:', changedFileInfo);
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
            symlinks: false,
            modules: [
                path.join(process.cwd(), 'node_modules')
            ]
        },
        watchOptions: {
            ignored: /dist/
        },
        externals
    };
}
exports.default = default_1;
;
