import { PARSER_SUPPORT_PLATFORM } from './const';

type configOptionsType = {
    projectRootDirPath?: string,
    entry?: string,
    platform?: string,
    generateFlatDependency?: boolean,
    generateTreeDependency?: boolean
}

class ConfigResolver {
    projectRootDirPath: string;
    entry: string;
    platform: string;
    generateFlatDependency: boolean;
    generateTreeDependency: boolean;

    constructor(options: configOptionsType) {
        // 项目的根目录，需要绝对路径，用于处理部分相对路径元数据的转换
        this.validateExisted(options, 'projectRootDirPath');
        this.projectRootDirPath = options.projectRootDirPath;

        // 依赖分析入口，一般是入口 js 文件，需要绝对路径并携带完整后缀名
        this.validateExisted(options, 'entry');
        this.entry = options.entry;

        // 当前处理的渠道，不同渠道分析的文件后缀和解析逻辑可能存在一些区别
        this.validateExisted(options, 'platform');
        this.platform = this.validateSupportPlatform(options.platform);

        // 调用 parse 函数后是否生成扁平化的依赖数据，即所有遍历到的文件的数组，默认为 true（不开启也会采集这部分数据，只是不会作为结果输出）
        this.generateFlatDependency = options.generateFlatDependency === undefined ? true : options.generateFlatDependency;

        // 调用 parse 函数后是否生成树形的依赖关系，即通过依赖关系连接起来的树形依赖数据结构，默认为 false（不开启不会采集这部分数据，会节约时间）
        this.generateTreeDependency = options.generateTreeDependency === undefined ? false : options.generateTreeDependency;
    }

    // 必填项字段用这个校验
    validateExisted(options: configOptionsType, key: string) {
        // @ts-ignore
        if (!options || (options && !options[key])) {
            throw new Error(`配置字段 ${key} 不能为空`);
        }
    }

    validateSupportPlatform(platform: string) {
        if (PARSER_SUPPORT_PLATFORM.some((p) => p === platform)) {
            return platform;
        } else {
            throw new Error(`[dependencyParser] 不支持的渠道 ${platform}`);
        }
    }
}

export { ConfigResolver, configOptionsType };
