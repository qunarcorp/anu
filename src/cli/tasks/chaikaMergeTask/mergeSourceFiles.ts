//app.json中路由需要注入到app.js, 并且根据order字段决定注入顺序
//app.json中alias需要校验冲突，并且注入到package.json中
//package.json中需要校验运行依赖，开发依赖的冲突
//*Config.json需要校验冲突，并合并
import {
    get_ANU_ENV,
    get_BUILD_ENV,
    get_buildType,
    getUniqueSubPkgConfig,
    getMergedData,
    getMergeDir,
    validateAppJsFileCount,
    validateConfigFileCount,
    validateMiniAppProjectConfigJson,
    xDiff,
    generateMetaFilesMap
} from './mergeUtils';
import { projectConfigJsonMap } from '../../consts';
import {execSyncInstallTasks} from './installTasks';
import utils from '../../packages/utils';
import config, {projectSourceType} from '../../config/config';
import chalk from 'chalk';

const fs = require('fs-extra');
const path = require('path');
const cwd = process.cwd();

let mergeFilesQueue = require('./mergeFilesQueue');

const buildType = get_buildType();
const ANU_ENV = get_ANU_ENV();
const BUILD_ENV = get_BUILD_ENV();

type checkJsonImportSyntaxObject = {

}

/**
 * 将指定内容插入到 app.js 中
 * @param {String} appJsSrcPath app.js绝对路径
 * @param {Array} pages 所有的页面路径
 * @return {Object}
 */
function getMergedAppJsConent(appJsSrcPath: string, pages: Array<string> = [], importSyntax: Array<string> = []) {
    function getAppImportSyntaxCode(importSyntax: Array<string> = []) {
        /**
         * app.json
         * {
         *   "imports": ["import a from '@b/c'"]
         * }
         */
        let importSyntaxList = importSyntax.map(function (curEl) {
            curEl = curEl.trim();
            if (!/;$/.test(curEl)) {
                curEl = curEl + ';';
            }
            return curEl;
        });
        return importSyntaxList.length ? importSyntaxList.join("\n") + '\n' : '';
    }

    // 1. pages 中的全部入口需要插入
    let allRoutesStr = pages.map(function (pageRoute: any) {
        if (!(/^\.\//.test(pageRoute))) {
            pageRoute = './' + pageRoute;
        }
        pageRoute = `import '${pageRoute}';\n`;
        return pageRoute;
    }).join('');

    // 2. app.json 中 import 中的语句需要强制插入到最终的 app.js 中 （对应为 map 的 importSyntax 字段）
    allRoutesStr += getAppImportSyntaxCode(importSyntax);

    // 执行插入
    return new Promise(function (rel, rej) {
        let appJsSrcContent = '';
        let appJsDist = path.join(getMergeDir(), 'source', 'app.js');
        try {
            appJsSrcContent = fs.readFileSync(appJsSrcPath).toString();
        } catch (err) {
            rej(err);
        }
        appJsSrcContent = allRoutesStr + appJsSrcContent;
        rel({
            content: appJsSrcContent,
            dist: appJsDist
        });
    });
}

/**
 * @param {Array} queue 所有需要经过 merged 处理的文件
 * @return {String} 找到app.js的路径
 */
function getAppJsSourcePath(queue: any = []) {
    let appJsSourcePath = queue.filter(function (file: any) {
        file = file.replace(/\\/g, '/');
        return /\/app\.js$/.test(file);
    })[0];
    return appJsSourcePath;
}


/**
 * 获取多个包的 xxConfig.json，然后合并
 */
function getMergedXConfigContent(config: any) {
    let env = ANU_ENV;
    let xConfigJsonDist = path.join(getMergeDir(), 'source', `${env}Config.json`);
    let ret = xDiff(config);

    // subpackages 字段去重
    for (let i in ret) {
        if (i.toLocaleLowerCase() === 'subpackages') {
            ret[i] = getUniqueSubPkgConfig(ret[i]);
        }
    }

    // TODO: 马甲的支持得重新设计
    // 通过 XXskipConfig.json 和环境变量过滤最终 app.json 中的一些内容
    // const skipConfigPath = getDownLoadHomeDir(env);
    // console.log('skipConfigPath:', skipConfigPath);
    // const skipEnv = process.env.SKIP;
    // if (fs.existsSync(skipConfigPath)) {
    //     console.log(`识别到 nnc_home_qunar 中包含 ${env}SkipConfig.json 文件，skipEnv=${skipEnv}，准备执行配置过滤任务`)
    //
    //     const skipConfig = require(skipConfigPath);
    //     for (let key in skipConfig) {
    //         if (key === skipEnv) { // skipEnv 为 undefined 时不进行过滤
    //             const skipConfigObj = skipConfig[key];
    //             for (let skipItemKey in skipConfigObj) {
    //                 // 目前支持的 配置字段只有 plugin 和 requiredPrivateInfos
    //                 if (skipItemKey === 'plugins') {
    //                     let retPlugin = ret.plugins;
    //                     if (retPlugin) {
    //                         let filteredObject = {}
    //                         for (let retPluginKey in retPlugin) {
    //                             if (skipConfigObj[skipItemKey].includes(retPluginKey)) {
    //                                 // do noting
    //                             } else {
    //                                 filteredObject[retPluginKey] = retPlugin[retPluginKey];
    //                             }
    //                         }
    //                         ret.plugins = filteredObject;
    //                     }
    //                 }
    //
    //                 if (skipItemKey === 'requiredPrivateInfos') {
    //                     const retRequiredPrivateInfos = ret.requiredPrivateInfos;
    //                     if (retRequiredPrivateInfos) {
    //                         for (let i = 0; i < retRequiredPrivateInfos.length; i++) {
    //                             if (skipConfigObj[skipItemKey].includes(retRequiredPrivateInfos[i])) {
    //                                 ret.requiredPrivateInfos.splice(i, 1);
    //                             }
    //                         }
    //                     }
    //                 }
    //
    //                 // 新的 skip 字段可以这里加
    //             }
    //         } else {
    //             console.log(`skipEnv=${skipEnv}，在 ${env}SkipConfig.json 文件中没有找到对应的配置，跳过过滤任务`);
    //         }
    //     }
    // } else {
    //     console.log(`skipEnv=${skipEnv}，在路径 ${skipConfigPath} 下没有找到过滤配置文件，跳过过滤任务`);
    // }

    return Promise.resolve({
        dist: xConfigJsonDist,
        content: JSON.stringify(ret, null, 4)
    });
}

function getSitemapContent(quickRules: any) {
    if (!quickRules) {
        return Promise.resolve({
            content: ''
        });
    }
    const rulesList = Array.from(quickRules).map((el: any) => {
        return el[0];
    });

    const content = JSON.stringify({ rules: rulesList });
    return Promise.resolve({
        dist: path.join(getMergeDir(), 'source/sitemap.json'),
        content
    });
}

/**
 * 将合并好的 alias 对象，跟目前的 package.json 进行合并
 */
function getMergedPkgJsonContent(alias: any) {
    let currentPkg = require(path.join(cwd, 'package.json'));
    let distContent = Object.assign({}, currentPkg, {
        nanachi: {
            alias: alias
        }
    });
    let dist = path.join(getMergeDir(), 'package.json');
    return {
        dist: dist,
        content: JSON.stringify(distContent, null, 4)
    };
}

// 读取官方 ide 配置文件，因为 project.config.json 只存在于 home，所以也没做啥特殊的操作
function getMiniAppProjectConfigJson(projectConfigQueue: any = []) {
    const projectConfigFileName = (projectConfigJsonMap[buildType] || projectConfigJsonMap.wx).fileName;
    let dist = path.join(getMergeDir(), projectConfigFileName);
    let distContent = '';

    if (projectConfigQueue.length) {
        const configJson = require(projectConfigQueue[0]);
        // 兼容马甲小程序
        if (process.env.appid) {
            configJson.appid = process.env.appid;
        }
        distContent = JSON.stringify(configJson, null, 4);
    }
    return {
        dist: dist,
        content: distContent
    };
}

// import 语句涉及到对 js 文件内容的增加，且大概率使用到 alias
// 因此如果是单包打包触发的多包打包，需要把工作区项目里的这部分内容加入打包流程中，做到在编译前合并，而不是编译后
// 否则 js 文件内容的删减会影响到 sourcemap 的生成（在编译结束后对 js 做修改会影响到 sourcemap 的可用性）
// 除此之外，如果 nanachi install 下载过产物包，也需要检查一下各产物包是否也存在这种情况
/**
 *
 * @param map  本次打包时使用的元数据对象，用于标记后续编译流程需要执行的任务
 * @param appJsonPath  需要检查的 app.json 文件路径，所有需要的字段都在文件里
 */
function addImportAndAlias(map: any, appJsonPath: string) {
    // alias 和 import 的数据都在 app.json 中
    if (fs.existsSync(appJsonPath)) {
        let targetAppJson;
        try {
            targetAppJson = require(appJsonPath);
        } catch (err) {
            console.error(chalk.red(`[addWorkSpaceImportAndAlias] ${appJsonPath} 文件解析失败，请联系 nanachi 开发者`));
            process.exit(1);
        }

        if (targetAppJson.imports && Array.isArray(targetAppJson.imports) && targetAppJson.imports.length > 0) {
            const alias = targetAppJson.alias || {};
            const importSyntax = targetAppJson.imports || [];

            // 给 importSyntax 中每个语句的前边加入 /* nanachi-ignore-dependency */
            // 防止因为打包时找不到依赖抛 module not found 异常
            importSyntax.forEach((el: string, index: number) => {
                importSyntax[index] = `/* nanachi-ignore-dependency */${el}`;
            });

            // 需要注意这里，如果是 import 语句涉及到的 alias，需要写在 app.json 里的，不能《只》写在 pkg 里
            map.alias = map.alias || [];
            map.alias.push({
                id: appJsonPath,
                content: alias,
                type: 'alias'
            });

            map.importSyntax = map.importSyntax || [];
            // 此处不去重了，因为光从字符串判断不出来是否有重复引入的情况
            // 如果重复引用了，编译时会报错
            map.importSyntax = map.importSyntax.concat(importSyntax);
        }
    }
}


/**
 * mergeSourceFile 仅用于合并属于源码类型的包（包中都是未打包前的代码）
 * 需要特殊处理的文件类型：lockFile、app.js、app.json、pkg.json
 */
export default function () {
    console.log('mergeFilesQueue:', mergeFilesQueue);
    let queue = Array.from(mergeFilesQueue);
    validateAppJsFileCount(queue); // 校验 app.js 是否只存在一个
    validateConfigFileCount(queue); // 校验存在 xxConfig.json 路径是否正确且该文件的目录下是否存在 app.js
    validateMiniAppProjectConfigJson(queue); // 校验 projectConfig.json 是否只存在一个

    // 校验完开始合并，此处准备后续合并需要的元数据对象
    let map: any = generateMetaFilesMap(queue);

    // 当 build or watch 命令是由单包触发的多包打包时，需要处理工作区的 app.json
    if (config.noCurrent) {
        addImportAndAlias(map, path.join(utils.getWorkSpaceSourceDirPath(), 'app.json'));
    }

    config.projectSourceTypeList.forEach((project: projectSourceType) => {
        // 当前项目下载缓存区中存在产物类型的包时，需要处理其中的 app.json
        if (project.sourceType === 'output') {
            addImportAndAlias(map, path.join(project.path, 'app.json'));
        }
    });

    // console.log('map', JSON.stringify(map));
    /* 以下是旧流程中使用 flight 作为工作区开发的 map
    {
        "xconfig": [{
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_home_qunar/wxConfig.json",
            "content": {
                "permission": {
                    "scope.userLocation": {
                        "desc": "去哪儿会在搜索、查询和预订等服务中使用您的位置信息。"
                    }
                },
                "navigateToMiniProgramAppIdList": ["wxb69f4334960a7ce6", "wx9c9b45db7a992a44", "wxe5ca79d1b4b68679", "wxd0681552bc8ed633", "wxd7464735f4dc21b7", "wx3258f747a3258021", "wxb9e9f5db385e2e6f", "wxb937e3d0b3ca117e", "wx6885acbedba59c14", "wxe6b7263f09aa9b58"],
                "requiredPrivateInfos": ["getLocation", "onLocationChange", "chooseAddress", "chooseLocation"],
                "lazyCodeLoading": "requiredComponents",
                "__usePrivacyCheck__": true
            }
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_flight_old_nanachi/source/wxConfig.json",
            "content": {
                "subpackages": [{
                    "name": "flight",
                    "resource": "pages/flight"
                }]
            }
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_platform/source/wxConfig.json",
            "content": {
                "subpackages": [{
                    "name": "flightWeb",
                    "resource": "flight/pages"
                }, {
                    "name": "coupon",
                    "resource": "pages/coupon"
                }, {
                    "name": "alonePlatform",
                    "resource": "pages/alonePlatform"
                }, {
                    "name": "ppTrip",
                    "resource": "pages/tripP"
                }, {
                    "name": "ticketP",
                    "resource": "pages/ticketP"
                }],
                "plugins": {
                    "live-player-plugin": {
                        "version": "1.2.4",
                        "name": "live-player-plugin",
                        "provider": "wx2b03c6e691cd7370"
                    }
                }
            }
        }],
        "alias": [{
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_home_qunar/app.json",
            "content": {
                "@common": "source/common",
                "@components": "source/components"
            },
            "type": "alias"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_flight_old_nanachi/source/app.json",
            "content": {
                "@mobx": "source/common/mobx/index",
                "@mobx-react": "source/common/mobx-react/index"
            },
            "type": "alias"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_platform/source/app.json",
            "content": {
                "@style": "source/style",
                "@assets": "source/assets",
                "@common": "source/common",
                "@components": "source/components",
                "@flightCommon": "source/common/flight",
                "@flightComponents": "source/flight/pages/components"
            },
            "type": "alias"
        }],
        "importSyntax": ["import { Provider } from '@mobx-react'"],
        "pkgDependencies": [{
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_home_qunar/package.json",
            "content": {
                "@qnpm/qmark": "^2.0.34",
                "@qnpm/miniwx-error-reporter": "^1.0.0",
                "cookie": "^0.3.1",
                "regenerator-runtime": "0.12.1",
                "url": "^0.11.0"
            },
            "type": "dependencies"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_flight_old_nanachi/package.json",
            "content": {
                "lottie-miniprogram": "^1.0.11",
                "mini-html-parser3": "^0.3.4",
                "mobx": "^4.13.0",
                "mobx-react": "^5.4.4",
                "regenerator-runtime": "0.12.1"
            },
            "type": "dependencies"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_platform/package.json",
            "content": {
                "@ctrip/pay-tinyapp-libs": "1.7.10",
                "await-to-js": "^2.1.1",
                "chalk": "^2.4.2"
            },
            "type": "dependencies"
        }],
        "pkgDevDep": [{
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_home_qunar/package.json",
            "content": {
                "babel-eslint": "^10.0.1",
                "eslint": "^5.6.1",
                "eslint-plugin-react": "^7.11.1",
                "javascript-obfuscator": "^2.9.4",
                "pre-commit": "^1.2.2",
                "request": "^2.88.2",
                "@qnpm/mini_wx_component": "^1.0.1"
            },
            "type": "devDependencies"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_flight_old_nanachi/package.json",
            "content": {
                "babel-eslint": "^10.0.1",
                "babel-jest": "^24.9.0",
                "eslint": "^5.6.1",
                "eslint-config-standard": "^14.0.0",
                "eslint-config-standard-react": "^9.0.0",
                "eslint-plugin-import": "^2.18.2",
                "eslint-plugin-node": "^9.1.0",
                "eslint-plugin-promise": "^4.2.1",
                "eslint-plugin-react": "^7.11.1",
                "eslint-plugin-standard": "^4.0.1",
                "husky": "^3.0.4",
                "jest": "^24.9.0",
                "jest-cli": "^24.9.0",
                "lint-staged": "^9.2.3"
            },
            "type": "devDependencies"
        }, {
            "id": "/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_module_qunar_platform/package.json",
            "content": {
                "@sniperjs/miniwx-error-reporter": "^0.1.13",
                "@types/quickapp": "npm:quickapp-interface@^1.0.0",
                "babel-eslint": "^10.0.1",
                "cross-env": "^7.0.2",
                "eslint": "^5.6.1",
                "eslint-plugin-hybrid": "0.0.5",
                "eslint-plugin-nanachi": "^0.2.5",
                "eslint-plugin-react": "^7.11.1",
                "fa-toolkit": "^12.6.1-Stable.301",
                "hap-toolkit": "latest",
                "pre-commit": "^1.2.2",
                "regenerator-runtime": "^0.12.1",
                "sass-loader": "^8.0.2",
                "schnee-ui": "latest",
                "stylelint": "^10.1.0",
                "stylelint-plugin-nanachi": "^0.2.2"
            },
            "type": "devDependencies"
        }],
        "ignoreInstallPkg": ["^(eslint)", "^(husky)", "^(jest)", "^(lint-)", "sass-loader", "jest-cli", "stylelint", "^(babel)", "pre-commit", "cross-env"],
        "projectConfigJson": ["/Users/qitmac001157/Desktop/nnc_module_qunar_flight_old_nanachi/.CACHE/download/wx/nnc_home_qunar/project.config.json"],
        "pages": ["pages/platform/indexWx/index", "pages/alonePlatform/subscribePage/index", "pages/platform/login/index", "pages/orderList/orderList/index", "pages/platform/userCenterWx/index", "pages/platform/myPage/index", "pages/orderList/noOrderList/index", "pages/alonePlatform/orderList/index", "pages/alonePlatform/noOrderList/index", "pages/alonePlatform/citySelect/index", "pages/alonePlatform/calendar/index", "pages/alonePlatform/coupon/list/index", "pages/alonePlatform/coupon/detail/index", "pages/alonePlatform/flight/index", "pages/alonePlatform/activeWebView/index", "pages/alonePlatform/marketWebView/index", "pages/alonePlatform/pay/index", "pages/alonePlatform/login/index", "pages/coupon/list/index", "pages/coupon/detail/index", "pages/platform/webView/index", "pages/alonePlatform/webView/index", "pages/alonePlatform/feedback/index", "pages/alonePlatform/realNameGuide/index", "pages/alonePlatform/pushMiddlePage/index", "pages/alonePlatform/wxPay/realNameAuth/index", "pages/alonePlatform/wxPay/payResult/index", "pages/alonePlatform/contact/list/index", "pages/alonePlatform/contact/editList/index", "flight/pages/h5/h5", "flight/pages/payOrder/payOrder", "flight/pages/orderDetail/orderDetail", "flight/pages/redirect/index", "flight/pages/middlePage/middlePage", "flight/pages/activity/activity", "pages/alonePlatform/actWebWx/index", "common/utils/hookUrl/index.js", "common/utils/hotelLog.js", "pages/ticketP/booking/booking", "pages/ticketP/detail/detail", "pages/ticketP/shop/shop", "pages/tripP/focusWechat/index", "pages/tripP/tripList/index", "pages/tripP/tripListOfTimeLine/index", "pages/tripP/tripShare/index", "pages/alonePlatform/loginAuth/index", "pages/platform/qPlay/index", "pages/alonePlatform/lowPriceAuth/index", "pages/alonePlatform/cqpay/holdpay/index", "pages/alonePlatform/cqpay/holdpayNew/index", "pages/alonePlatform/cqpay/holdpayDetail/index", "pages/alonePlatform/cqpay/protocol/index", "pages/flight/home/index", "pages/flight/calendar/index", "pages/flight/citySelect/index", "pages/flight/list/index", "pages/flight/ota/index", "pages/flight/booking/index", "pages/flight/coupon/index", "pages/flight/secWebview/index", "pages/flight/contacterList/index", "pages/flight/MaintainPassenger/index", "pages/flight/PassengerList/index", "pages/flight/passengerNationality/index"]
    }
    */
    // TODO: 这块的执行粒度还是太粗，建议再拆分出来几个任务
    // TODO: 另外对于文件的合并和拷贝还可以进一步抽象，连同 mergeSourceFilesInOutput 和 mergeUtils 一起
    let tasks = [
        // app.js 路由注入以及其他内容注入
        getMergedAppJsConent(getAppJsSourcePath(queue), map.pages, map.importSyntax),
        // xxConfig.json合并
        getMergedXConfigContent(map.xconfig),
        // alias合并
        getMergedPkgJsonContent(getMergedData(map.alias)),
        // project.config.json处理
        getMiniAppProjectConfigJson(map.projectConfigJson),
    ];

    if (ANU_ENV === 'quick') {
        // https://doc.quickapp.cn/framework/sitemap.html
        tasks.push(getSitemapContent(map.quickRules));
    }

    execSyncInstallTasks(map);

    // 根据 tasks 中任务生成的 dist 和 content 写入文件内容
    return Promise.all(tasks)
        .then(function (queue) {
            queue = queue.map(function ({ dist, content }) {
                return new Promise(function (rel, rej) {
                    if (!content) {
                        rel(1);
                        return;
                    }
                    fs.ensureFileSync(dist);
                    fs.writeFile(dist, content, function (err: any) {
                        if (err) {
                            rej(err);
                        } else {
                            rel(1);
                        }
                    });
                });
            });
            return Promise.all(queue);
        });
}
