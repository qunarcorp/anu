"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const const_1 = require("./const");
class ConfigResolver {
    constructor(options) {
        this.validateExisted(options, 'projectRootDirPath');
        this.projectRootDirPath = options.projectRootDirPath;
        this.validateExisted(options, 'entry');
        this.entry = options.entry;
        this.validateExisted(options, 'platform');
        this.platform = this.validateSupportPlatform(options.platform);
        this.generateFlatDependency = options.generateFlatDependency === undefined ? true : options.generateFlatDependency;
        this.generateTreeDependency = options.generateTreeDependency === undefined ? false : options.generateTreeDependency;
    }
    validateExisted(options, key) {
        if (!options || (options && !options[key])) {
            throw new Error(`配置字段 ${key} 不能为空`);
        }
    }
    validateSupportPlatform(platform) {
        if (const_1.PARSER_SUPPORT_PLATFORM.some((p) => p === platform)) {
            return platform;
        }
        else {
            throw new Error(`[dependencyParser] 不支持的渠道 ${platform}`);
        }
    }
}
exports.ConfigResolver = ConfigResolver;
