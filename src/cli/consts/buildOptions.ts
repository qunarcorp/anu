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
    'future': {
        alias: 'f',
        desc: '使用 webpack 5 进行编译'
    },
    'breakchange': {
        alias: 'b',
        desc: '使用更高性能但是可能导致产物和旧版本不一致的 webpack 配置'
    }
};

export default BUILD_OPTIONS;