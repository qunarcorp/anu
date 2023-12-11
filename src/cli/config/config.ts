
import * as path from 'path';
// import utils from '../packages/utils/index';

let userConfig: any = {};
let nanachiConfig: any = {};
try {
    const pkg = require(path.join(process.cwd(), 'package.json'));
    userConfig = pkg.nanachi || pkg.mpreact || userConfig;
    nanachiConfig = require(path.join('..', 'package.json'));
} catch (err) {
    // eslint-disable-next-line
}

const buildDir = userConfig.buildDir;
const sourceDir = userConfig.sourceDir || 'source';
const sourcemap = userConfig.sourcemap != undefined ? userConfig.sourcemap : true;

interface patchComponents {
    [patchName: string]: number | string;
}

interface PlatConfig {
    libName: string;
    styleExt?: string;
    xmlExt?: string;
    jsExt?: string;
    helpers: string;
    patchComponents: patchComponents,
    disabledTitleBarPages: Set<string>;
    patchPages?: any;
}

enum Platforms {
    wx = 'wx',
    qq = 'qq',
    ali = 'ali',
    bu = 'bu',
    tt = 'tt',
    quick = 'quick',
    h5 = 'h5',
    QIHOO = '360'
}


export type launchStatusType = 'NONE' | 'SUCCESS'; // 单包监听模式下，子进程的启动状态

export type validatePlatforms = 'wx' | 'qq' | 'ali' | 'bu' | 'tt' | 'quick' | 'h5' | '360';
// input 为源码，output 为产物
export type sourceTypeString = 'input' | 'output';
export interface projectSourceType {
    name: string, // 项目名
    path: string, // 所在的缓存区路径
    sourcemap ?: string, // 如果是产物类型，需要区分产物目录和sourcemap目录
    sourceType: sourceTypeString,
}

export interface GlobalConfigMap {
    buildType: validatePlatforms;      //构建类型默认微信小程序
    buildDir: string;
    inputBuildDir: string, //非快应用项目默认构建目录为dist
    sourceDir: string;  //默认生成的源码目录
    huawei: boolean;
    '360mode': boolean;
    patchComponents: patchComponents; // 项目中使用的补丁组件
    pluginTags: any;
    plugins: any;
    compress?: boolean;
    typescript?: boolean;
    WebViewRules?: any; // TODO
    nanachiVersion: string;
    sourcemap: boolean,
    isSingleBundle?: boolean,
    isWatch?: boolean,
    projectSourceTypeList: Array<projectSourceType>, // 目前 build、 watch 和前置流程解耦（例如 install 和各种 tasks）适配的场景有点多，该参数用于告诉后续流程需要对哪些包进行哪些处理
    projectWatcherList?: Set<string>, // 项目启动后，通过 webpack.compiler.watchFileSystem 监听的目录，最少包含当前项目，其次还包含 multiProject 里的那些
    noCurrent: boolean,
    childProcessLaunchStatus: launchStatusType,
    forFirstCompile: boolean,
    [Platforms.wx]: PlatConfig;
    [Platforms.qq]: PlatConfig;
    [Platforms.ali]: PlatConfig;
    [Platforms.bu]: PlatConfig;
    [Platforms.quick]: PlatConfig;
    [Platforms.tt]: PlatConfig;
    [Platforms.h5]: PlatConfig;
    [Platforms.QIHOO]: PlatConfig;
}
const config: GlobalConfigMap =  {
    wx: {
        libName: 'ReactWX',
        styleExt: 'wxss',
        xmlExt: 'wxml',
        helpers: 'wxHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    qq: {
        libName: 'ReactWX',
        styleExt: 'qss',
        xmlExt: 'qml',
        helpers: 'qqHelpers',
        patchComponents: {},
        disabledTitleBarPages: new Set()
    },
    ali: {
        libName: 'ReactAli',
        styleExt: 'acss',
        xmlExt: 'axml',
        helpers: 'aliHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    bu: {
        libName: 'ReactBu',
        styleExt: 'css',
        xmlExt: 'swan',
        helpers: 'buHelpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    h5: {
        libName: 'ReactH5',
        helpers: 'h5Helpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    '360': {
        libName: 'ReactH5',
        helpers: 'h5Helpers',
        patchComponents: {
            slider: 1
        },
        disabledTitleBarPages: new Set()
    },
    quick: {
        libName: 'ReactQuick',
        jsExt: 'ux',
        helpers: 'quickHelpers',
        patchComponents: {
            'radio': 1,
            'radio-group': 1,
            'checkbox': 1,
            'checkbox-group':1,
            'label': 1,
            'navigator': 1,
            'picker': 1
        },
        disabledTitleBarPages:new Set()
    },
    tt: {
        libName: 'ReactWX',
        jsExt: 'js',
        styleExt: 'ttss',
        xmlExt: 'ttml',
        helpers: 'ttHelpers',
        patchComponents: {},
        disabledTitleBarPages: new Set()
    },
    buildType: 'wx',      //构建类型默认微信小程序
    // TODO: 现在没办法只能搞出来两个变量，有时间重构
    inputBuildDir: buildDir, //非快应用项目默认构建目录为dist
    buildDir: buildDir, // 会根据一系列条件被重新写入
    sourceDir: sourceDir,  //默认生成的源码目录
    huawei: false,
    '360mode': false,
    typescript: false,
    nanachiVersion: nanachiConfig.version,
    patchComponents: {}, // 项目中使用的补丁组件
    pluginTags: {},
    sourcemap,
    plugins: {},
    noCurrent: false,
    childProcessLaunchStatus: 'NONE',
    forFirstCompile: true,
    projectSourceTypeList: [], // 通过 nanachi install 下载的所有的包的 sourceType，可能是源码也可能是产物
};



module.exports = config;
export default config;
