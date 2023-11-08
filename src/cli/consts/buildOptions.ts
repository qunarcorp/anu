export interface CmdOption {
    readonly desc: string,
    readonly alias?: string
}

export interface CmdMap {
    readonly [commandName: string]: CmdOption;
}

const BUILD_OPTIONS: CmdMap = {
    // 'compress': {
    //     alias: 'c',
    //     desc: '压缩资源'
    // },
    // 'beta': {
    //     desc: '同步react runtime'
    // },
    // 'beta-ui': {
    //     desc: '同步schnee-ui'
    // },
    'huawei': {
        desc: '补丁华为快应用'
    },
    // 'analysis': {
    //     alias: 'a',
    //     desc: '打包产物分析'
    // },
    'silent': {
        alias: 's',
        desc: '关闭eslint warning'
    },
    'typescript': {
        alias: 't',
        desc: '开启typescript编译'
    },
    'dir': {
        alias: 'd',
        desc: '自定义打包输出目录'
    },
    'multiProject': {
        alias: 'm',
        desc: '多工程的其他工程目录'
    },
    'component': { 
        alias: 'c', 
        desc: '单包打包'
    }
};

export default BUILD_OPTIONS;