export interface PublicPkgReference {
    [key: string]: {
        subpkgUse: {
            [key: string]: string[];
        };
        name: string;
        dependencies?: string[];
        putMain?: boolean;
    };
}
export declare const ASYNC_FILE_NAME = "ASYNC";
export declare let publicPkgComponentReference: PublicPkgReference;
export declare let publicPkgCommonReference: PublicPkgReference;
export declare enum ReferenceType {
    COMMON = 0,
    COMPONENTS = 1
}
