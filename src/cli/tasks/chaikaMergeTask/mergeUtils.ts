import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import utils from '../../packages/utils';
import {getMultiplePackDirPrefix} from './isMutilePack';
// @ts-ignore
import mergeWith from 'lodash.mergewith';
// @ts-ignore
import diff from 'deep-diff';


const buildType = process.argv.length > 2 ? process.argv[2].split(':')[1] : 'wx';

// 默认微信，如果是h5，则为web
const ANU_ENV = buildType
    ? buildType === 'h5'
        ? 'web'
        : buildType
    : 'wx';

// 环境
const BUILD_ENV = process.env.BUILD_ENV || '';

export function get_buildType() {
    return buildType;
}

export function get_ANU_ENV () {
    return ANU_ENV;
}

export function get_BUILD_ENV () {
    return BUILD_ENV;
}

export function orderRouteByOrder(map: any) {
    //根据order排序
    map['pages'] = map['pages'].sort(function (a: any, b: any) {
        return b.order - a.order;
    });
    map['pages'] = map['pages'].map(function (pageEl: any) {
        return pageEl.routes;
    });

    //二数组变一纬
    map['pages'] = [].concat(...map['pages']);
    return map;
}

// 校验app.js是否正确
export function validateAppJsFileCount(queue: any) {
    let appJsFileCount = queue
        .filter(function (el: string) {
            return /\/app\.js$/.test(el);
        })
        .filter(function (el: string) {
            // 非target构建目录
            return !/\/target\//.test(el)
        })
        .map(function (el: any) {
            return el.replace(/\\/g, '/').split('/download/').pop();
        });

    if (!appJsFileCount.length || appJsFileCount.length > 1) {
        let msg = '';
        if (!appJsFileCount.length) {
            msg = '校验到无 app.js 文件的拆库工程，请检查是否安装了该包含 app.js 文件的拆库工程.';
        } else if (appJsFileCount.length > 1) {
            msg = '校验到多个拆库仓库中存在app.js. 在业务线的拆库工程中，有且只能有一个拆库需要包含app.js' + '\n' + JSON.stringify(appJsFileCount, null, 4);
        }
        // eslint-disable-next-line
        console.log(chalk.bold.red(msg));
        process.exit(1);
    }
}

export function validateMiniAppProjectConfigJson(queue: any) {
    let projectConfigJsonList =
        queue
            .filter(function (el: string) {
                return /\/project\.config\.json$/.test(el);
            })
            .filter(function (el: string) {
                return !/\/target\//.test(el);
            })
    if (projectConfigJsonList.length > 1) {
        // eslint-disable-next-line
        console.log(chalk.bold.red('校验到多个拆库仓库中存在project.config.json. 在业务线的拆库工程中，最多只能有一个拆库需要包含project.config.json:'), chalk.bold.red('\n' + JSON.stringify(projectConfigJsonList, null, 4)));
        process.exit(1);
    }
}

//校验 XXConfig.json 路径是否正确
export function validateConfigFileCount(queue: any) {
    let configFiles = queue.filter(function (el: any) {
        return /Config\.json$/.test(el);
    });
    let errorFiles: any = [];
    configFiles.forEach(function (el: any) {
        el = el.replace(/\\/g, '/');
        //'User/nnc_module_qunar_platform/.CACHE/download/nnc_home_qunar/app.json' => nnc_home_qunar
        let projectName = el.replace(/\\/g, '/').split('/download/')[1].split('/')[0];
        let reg = new RegExp(projectName + '/' + ANU_ENV + 'Config.json$');
        let dir = path.dirname(el);
        if (reg.test(el) && !fs.existsSync(path.join(dir, 'app.js'))) {
            errorFiles.push(el);
        }
    });


    if (errorFiles.length) {
        // eslint-disable-next-line
        console.log(chalk.bold.red('⚠️   校验到拆库仓库中配置文件路径错误，请将该配置文件放到 source 目录中:'));
        console.log(chalk.bold.red(errorFiles.join('\n')) + '\n');
        process.exit(1);
    }
}


export function getMergeDir() {
    return path.join(utils.getProjectRootPath(), '.CACHE/nanachi', getMultiplePackDirPrefix());
}

// 获取 skip 配置文件在不同的环境下有三种可能，取存在的那种即可
export function getDownLoadHomeDir(env: string) {
    // 壳子是 home 包 或者 .Cache 中的 download
    if (fs.existsSync(path.join(utils.getProjectRootPath(), `${env}SkipConfig.json`))) {
        return path.join(utils.getProjectRootPath(), `${env}SkipConfig.json`);
    } else if (fs.existsSync(path.join(utils.getProjectRootPath(), '.CACHE/download', getMultiplePackDirPrefix(), 'nnc_home_qunar', `${env}SkipConfig.json`))) {
        return path.join(utils.getProjectRootPath(), '.CACHE/download', getMultiplePackDirPrefix(), 'nnc_home_qunar', `${env}SkipConfig.json`);
    } else {
        return path.join(utils.getProjectRootPath(), '.CACHE/download', getMultiplePackDirPrefix(), 'qunar_miniprogram.nnc_home_qunar', `${env}SkipConfig.json`);
    }
}

// 获取一个对象中指定 path 上的值
export function getValueByPath(path: any, data: any) {
    path = path.slice(0);
    var ret;
    while (path.length) {
        var key = path.shift();
        if (!ret) {
            ret = data[key] || '';
        } else {
            ret = ret[key] || '';
        }
    }
    return ret;
}

// 指定 lodash.mergewith 进行合并，如果是数组，则先去重，然后再合并
function customizer(objValue: any, srcValue: any) {
    if (Array.isArray(objValue)) {
        return Array.from(new Set(objValue.concat(srcValue)));
    }
}

/**
 * 合并时对 json 类型的文件内容进行 diff 的通用函数
 */
export function xDiff(list: any) {
    if (!list.length) return {};
    let first = list[0];
    let confictQueue: any[] = [];
    let other = list.slice(1);
    let isConfict = false;

    // 进行 diff，过滤 diff 结果；如果存在 diff 结果，则认为是冲突
    for (let i = 0; i < other.length; i++) {
        // https://www.npmjs.com/package/deep-diff
        let x = diff(first.content, other[i].content) || [];
        x = x.filter(function (el: any) {
            // 只比较key/value, 不比较数组, 数组认为是增量合并, diff模块中，如何有数组比较， DiffEdit中path字段必定有index(数字)
            // [ DiffEdit { kind: 'E', path: [ 'list', 0, 'name' ], lhs: 1, rhs: 2 },
            return el.kind === 'E'
                && el.path.every(function (el: string | number) {
                    return typeof el === 'string'
                });
        });
        if (x.length) {
            isConfict = true;
            confictQueue = [...x];
            break;
        }
    }

    // 冲突处理，并直接终止进程
    if (isConfict) {
        var errList: any = [];
        confictQueue.forEach(function (confictEl) {
            //let keyName = confictEl.path[confictEl.path.length - 1];
            let kind: any = [];
            list.forEach(function (el: any) {
                let confictValue = getValueByPath(confictEl.path, el.content);
                if (confictValue) {
                    let errorItem: any = {};
                    errorItem.confictFile = el.id.replace(/\\/g, '/').split(/\/download\//).pop();
                    errorItem.confictValue = confictValue || '';

                    //
                    if (el.type === 'dependencies') {
                        errorItem.confictKeyPath = ['dependencies', ...confictEl.path];
                    } else if (el.type === 'devDependencies') {
                        errorItem.confictKeyPath = ['devDependencies', ...confictEl.path];
                    } else if (el.type === 'alias') {
                        errorItem.confictKeyPath = ['nanachi', 'alias', ...confictEl.path];
                    } else {
                        errorItem.confictKeyPath = confictEl.path;
                    }

                    errorItem.confictKeyPath = JSON.stringify(errorItem.confictKeyPath);
                    kind.push(errorItem);
                }
            });
            errList.push(kind);
        });

        var msg = '';

        errList.forEach(function (errEl: any) {
            let kindErr = '';
            errEl.forEach(function (errItem: any) {
                var tpl = `
冲突文件: ${(errItem.confictFile)}
冲突路径 ${errItem.confictKeyPath}
冲突详情：${JSON.stringify({[JSON.parse(errItem.confictKeyPath).pop()]: errItem.confictValue}, null, 4)}
`;
                kindErr += tpl;
            });
            msg = msg + kindErr + '\n--------------------------------------------------\n';
        });

        // eslint-disable-next-line
        console.log(chalk.bold.red('⚠️  发现冲突! 请先解决冲突。\n\n' + msg));
        process.exit(1);
    }

    isConfict = false;

    // 不存在冲突了，则将所有传入的配置，合并为一个完整的对象
    if (!isConfict) {
        return list.reduce(function (ret: any, el: any) {
            return mergeWith(ret, el.content, customizer);
        }, {});
    } else {
        return {};
    }
}

export function getMergedData(configList: any) {
    return xDiff(configList);
}
