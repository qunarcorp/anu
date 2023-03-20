/**
 * 公共包引用。数据格式如下
 * {
    "async/components/QunarLoading/index":{
        "subpkgUse":{
            "pages/alonePlatform":[
                "pages/alonePlatform/components/CitySelector/index.json"
            ]
        },
        "name":"anu-qunarloading",
        "dependencies":[
            "async/components/Ubutton/index"
        ]
    },
    "async/components/Ubutton/index":{
        "subpkgUse":{
            "ASYNC":[
                "async/components/QunarLoading/index.json"
            ]
        },
        "name":"anu-ubutton"
    }
}
 */
export interface PublicPkgReference {
    [key: string]: {
        subpkgUse: {
            [key: string]: string[]
        },
        name: string,
        dependencies?: string[],
        putMain?: boolean,
    }
}

export const ASYNC_FILE_NAME = 'ASYNC';
export let publicPkgComponentReference: PublicPkgReference = {};
export let publicPkgCommonReference: PublicPkgReference = {};

export enum ReferenceType {
    COMMON,
    COMPONENTS,
}
