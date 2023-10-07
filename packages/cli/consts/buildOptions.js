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
    'multiProject': {
        alias: 'm',
        desc: '多工程的其他工程目录'
    }
};
exports.default = BUILD_OPTIONS;
