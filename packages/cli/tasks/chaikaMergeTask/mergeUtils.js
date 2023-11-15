"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const utils_1 = __importDefault(require("../../packages/utils"));
const isMutilePack_1 = require("./isMutilePack");
const lodash_mergewith_1 = __importDefault(require("lodash.mergewith"));
const deep_diff_1 = __importDefault(require("deep-diff"));
const buildType = process.argv.length > 2 ? process.argv[2].split(':')[1] : 'wx';
const ANU_ENV = buildType
    ? buildType === 'h5'
        ? 'web'
        : buildType
    : 'wx';
const BUILD_ENV = process.env.BUILD_ENV || '';
function get_buildType() {
    return buildType;
}
exports.get_buildType = get_buildType;
function get_ANU_ENV() {
    return ANU_ENV;
}
exports.get_ANU_ENV = get_ANU_ENV;
function get_BUILD_ENV() {
    return BUILD_ENV;
}
exports.get_BUILD_ENV = get_BUILD_ENV;
function orderRouteByOrder(map) {
    map['pages'] = map['pages'].sort(function (a, b) {
        return b.order - a.order;
    });
    map['pages'] = map['pages'].map(function (pageEl) {
        return pageEl.routes;
    });
    map['pages'] = [].concat(...map['pages']);
    return map;
}
exports.orderRouteByOrder = orderRouteByOrder;
function validateAppJsFileCount(queue) {
    let appJsFileCount = queue
        .filter(function (el) {
        return /\/app\.js$/.test(el);
    })
        .filter(function (el) {
        return !/\/target\//.test(el);
    })
        .map(function (el) {
        return el.replace(/\\/g, '/').split('/download/').pop();
    });
    if (!appJsFileCount.length || appJsFileCount.length > 1) {
        let msg = '';
        if (!appJsFileCount.length) {
            msg = '校验到无 app.js 文件的拆库工程，请检查是否安装了该包含 app.js 文件的拆库工程.';
        }
        else if (appJsFileCount.length > 1) {
            msg = '校验到多个拆库仓库中存在app.js. 在业务线的拆库工程中，有且只能有一个拆库需要包含app.js' + '\n' + JSON.stringify(appJsFileCount, null, 4);
        }
        console.log(chalk_1.default.bold.red(msg));
        process.exit(1);
    }
}
exports.validateAppJsFileCount = validateAppJsFileCount;
function validateMiniAppProjectConfigJson(queue) {
    let projectConfigJsonList = queue
        .filter(function (el) {
        return /\/project\.config\.json$/.test(el);
    })
        .filter(function (el) {
        return !/\/target\//.test(el);
    });
    if (projectConfigJsonList.length > 1) {
        console.log(chalk_1.default.bold.red('校验到多个拆库仓库中存在project.config.json. 在业务线的拆库工程中，最多只能有一个拆库需要包含project.config.json:'), chalk_1.default.bold.red('\n' + JSON.stringify(projectConfigJsonList, null, 4)));
        process.exit(1);
    }
}
exports.validateMiniAppProjectConfigJson = validateMiniAppProjectConfigJson;
function validateConfigFileCount(queue) {
    let configFiles = queue.filter(function (el) {
        return /Config\.json$/.test(el);
    });
    let errorFiles = [];
    configFiles.forEach(function (el) {
        el = el.replace(/\\/g, '/');
        let projectName = el.replace(/\\/g, '/').split('/download/')[1].split('/')[0];
        let reg = new RegExp(projectName + '/' + ANU_ENV + 'Config.json$');
        let dir = path_1.default.dirname(el);
        if (reg.test(el) && !fs_extra_1.default.existsSync(path_1.default.join(dir, 'app.js'))) {
            errorFiles.push(el);
        }
    });
    if (errorFiles.length) {
        console.log(chalk_1.default.bold.red('⚠️   校验到拆库仓库中配置文件路径错误，请将该配置文件放到 source 目录中:'));
        console.log(chalk_1.default.bold.red(errorFiles.join('\n')) + '\n');
        process.exit(1);
    }
}
exports.validateConfigFileCount = validateConfigFileCount;
function getMergeDir() {
    return path_1.default.join(utils_1.default.getProjectRootPath(), '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix());
}
exports.getMergeDir = getMergeDir;
function getDownLoadHomeDir(env) {
    if (fs_extra_1.default.existsSync(path_1.default.join(utils_1.default.getProjectRootPath(), `${env}SkipConfig.json`))) {
        return path_1.default.join(utils_1.default.getProjectRootPath(), `${env}SkipConfig.json`);
    }
    else if (fs_extra_1.default.existsSync(path_1.default.join(utils_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix(), 'nnc_home_qunar', `${env}SkipConfig.json`))) {
        return path_1.default.join(utils_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix(), 'nnc_home_qunar', `${env}SkipConfig.json`);
    }
    else {
        return path_1.default.join(utils_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix(), 'qunar_miniprogram.nnc_home_qunar', `${env}SkipConfig.json`);
    }
}
exports.getDownLoadHomeDir = getDownLoadHomeDir;
function getValueByPath(path, data) {
    path = path.slice(0);
    var ret;
    while (path.length) {
        var key = path.shift();
        if (!ret) {
            ret = data[key] || '';
        }
        else {
            ret = ret[key] || '';
        }
    }
    return ret;
}
exports.getValueByPath = getValueByPath;
function customizer(objValue, srcValue) {
    if (Array.isArray(objValue)) {
        return Array.from(new Set(objValue.concat(srcValue)));
    }
}
function xDiff(list) {
    if (!list.length)
        return {};
    let first = list[0];
    let confictQueue = [];
    let other = list.slice(1);
    let isConfict = false;
    for (let i = 0; i < other.length; i++) {
        let x = deep_diff_1.default(first.content, other[i].content) || [];
        x = x.filter(function (el) {
            return el.kind === 'E'
                && el.path.every(function (el) {
                    return typeof el === 'string';
                });
        });
        if (x.length) {
            isConfict = true;
            confictQueue = [...x];
            break;
        }
    }
    if (isConfict) {
        var errList = [];
        confictQueue.forEach(function (confictEl) {
            let kind = [];
            list.forEach(function (el) {
                let confictValue = getValueByPath(confictEl.path, el.content);
                if (confictValue) {
                    let errorItem = {};
                    errorItem.confictFile = el.id.replace(/\\/g, '/').split(/\/download\//).pop();
                    errorItem.confictValue = confictValue || '';
                    if (el.type === 'dependencies') {
                        errorItem.confictKeyPath = ['dependencies', ...confictEl.path];
                    }
                    else if (el.type === 'devDependencies') {
                        errorItem.confictKeyPath = ['devDependencies', ...confictEl.path];
                    }
                    else if (el.type === 'alias') {
                        errorItem.confictKeyPath = ['nanachi', 'alias', ...confictEl.path];
                    }
                    else {
                        errorItem.confictKeyPath = confictEl.path;
                    }
                    errorItem.confictKeyPath = JSON.stringify(errorItem.confictKeyPath);
                    kind.push(errorItem);
                }
            });
            errList.push(kind);
        });
        var msg = '';
        errList.forEach(function (errEl) {
            let kindErr = '';
            errEl.forEach(function (errItem) {
                var tpl = `
冲突文件: ${(errItem.confictFile)}
冲突路径 ${errItem.confictKeyPath}
冲突详情：${JSON.stringify({ [JSON.parse(errItem.confictKeyPath).pop()]: errItem.confictValue }, null, 4)}
`;
                kindErr += tpl;
            });
            msg = msg + kindErr + '\n--------------------------------------------------\n';
        });
        console.log(chalk_1.default.bold.red('⚠️  发现冲突! 请先解决冲突。\n\n' + msg));
        process.exit(1);
    }
    isConfict = false;
    if (!isConfict) {
        return list.reduce(function (ret, el) {
            return lodash_mergewith_1.default(ret, el.content, customizer);
        }, {});
    }
    else {
        return {};
    }
}
exports.xDiff = xDiff;
function getMergedData(configList) {
    return xDiff(configList);
}
exports.getMergedData = getMergedData;
