export declare const PARSER_SUPPORT_PLATFORM: string[];
export declare const JS_ATTRIBUTE_TYPE: {
    SCRIPT: string;
    APP: string;
    PAGE: string;
    COMPONENT: string;
    OTHER: string;
};
export declare class DependencyNode {
    path: any;
    imports: any;
    type: any;
    subModules: any;
    constructor(path?: string, imports?: {});
}
export declare const IMPORT_TYPE: {
    deconstruct: string;
    default: string;
    namespace: string;
};
export declare const JS_FILE_GROUP: string[];
export declare const FILE_EXT_MAP: {
    wx: {
        css: string;
        xml: string;
    };
    qq: {
        css: string;
        xml: string;
    };
    ali: {
        css: string;
        xml: string;
    };
    bu: {
        css: string;
        xml: string;
    };
    tt: {
        css: string;
        xml: string;
    };
};
