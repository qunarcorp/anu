import config from '../../config/config';

export const PARSER_SUPPORT_PLATFORM = ['wx', 'qq', 'ali', 'bu', 'tt'];

export const JS_ATTRIBUTE_TYPE = {
    SCRIPT: 'script',
    APP: 'app',
    PAGE: 'page',
    COMPONENT: 'component',
    OTHER: 'other'
};

export class DependencyNode {
    path: any;
    imports: any;
    type: any;
    subModules: any;
    constructor(path = '', imports = {}) {
        this.path = path;
        this.type = JS_ATTRIBUTE_TYPE.OTHER;
        this.imports = imports;
        this.subModules = {};
    }
}

export const IMPORT_TYPE = {
    deconstruct: 'deconstruct',
    default: 'default',
    namespace: 'namespace'
};

export const JS_FILE_GROUP = ['.js', '.ts', '.jsx', '.tsx'];

export const FILE_EXT_MAP = {
    wx: {
        css: config.wx.styleExt || '.wxss',
        xml: config.wx.xmlExt ||'.wxml'
    },
    qq: {
        css: config.qq.styleExt || '.qss',
        xml: config.qq.xmlExt ||'.qml'
    },
    ali: {
        css: config.ali.styleExt || '.acss',
        xml: config.ali.xmlExt ||'.axml'
    },
    bu: {
        css: config.bu.styleExt || '.css',
        xml: config.bu.xmlExt ||'.swan'
    },
    tt: {
        css: config.tt.styleExt || '.ttss',
        xml: config.tt.xmlExt ||'.ttml'
    }
};
