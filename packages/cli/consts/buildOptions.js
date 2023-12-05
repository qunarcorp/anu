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
    },
    'component': {
        alias: 'c',
        desc: '单包打包'
    },
    'noCurrent': {
        alias: 'nc',
        desc: '打包时不包含当前包（不要主动调用）'
    }
};
exports.default = BUILD_OPTIONS;
