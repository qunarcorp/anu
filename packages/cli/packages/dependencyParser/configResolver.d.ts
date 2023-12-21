declare type configOptionsType = {
    projectRootDirPath?: string;
    entry?: string;
    platform?: string;
    generateFlatDependency?: boolean;
    generateTreeDependency?: boolean;
};
declare class ConfigResolver {
    projectRootDirPath: string;
    entry: string;
    platform: string;
    generateFlatDependency: boolean;
    generateTreeDependency: boolean;
    constructor(options: configOptionsType);
    validateExisted(options: configOptionsType, key: string): void;
    validateSupportPlatform(platform: string): string;
}
export { ConfigResolver, configOptionsType };
