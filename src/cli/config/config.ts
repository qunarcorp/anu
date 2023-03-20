
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

const buildDir = userConfig.buildDir || 'dist';
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

export type validatePlatforms = 'wx' | 'qq' | 'ali' | 'bu' | 'tt' | 'quick' | 'h5' | '360';

/**
 * 存在公共包，但不支持分包异步化的平台，分包规则：
 * 方案：根据分包数、配置决定放置主包还是分包。
 *      分包数：在多个分包时，n个分包及以上引用放在主包，n个以下放在各自分包中，n为multiPkglimit，默认是3。
 *      配置：配置放到主包/分包的文件/文件夹
 * 优先级：配置（不配置默认按下一优先级考虑，也就是按分包数考虑）>分包数
 */
interface SyncPlatformConfig {
    putMainInMultiSubPkgUse: string[];//分配到主包的文件/文件夹，正则字符串
    multiPkglimit: number;
}
export interface GlobalConfigMap {
    buildType: validatePlatforms;      //构建类型默认微信小程序
    buildDir: string;   //非快应用项目默认构建目录为dist
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
    publicPkg: boolean,
    requireAsync: boolean,
    syncPlatformConfig: SyncPlatformConfig,
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
    // 会被重新写入
    buildDir: buildDir,   //非快应用项目默认构建目录为dist
    sourceDir: sourceDir,  //默认生成的源码目录
    huawei: false,
    '360mode': false,
    typescript: false,
    nanachiVersion: nanachiConfig.version,
    patchComponents: {}, // 项目中使用的补丁组件
    pluginTags: {},
    sourcemap,
    publicPkg: false,// 是否包含公共包
    requireAsync: false,// 是否是分包异步化
    syncPlatformConfig: {
        putMainInMultiSubPkgUse: [],
        multiPkglimit: 3,
    },// 是否是分包异步化
    plugins: {}
};



module.exports = config;
export default config;
