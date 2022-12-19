"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BUILD_OPTIONS = {
    'huawei': {
        desc: '补丁华为快应用'
    },
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
exports.default = BUILD_OPTIONS;
