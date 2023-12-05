//app.json中路由需要注入到app.js, 并且根据order字段决定注入顺序
//app.json中alias需要校验冲突，并且注入到package.json中
//package.json中需要校验运行依赖，开发依赖的冲突
//*Config.json需要校验冲突，并合并
import {
    get_ANU_ENV,
    get_BUILD_ENV,
    get_buildType,
    getDownLoadHomeDir,
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

const fs = require('fs-extra');
const path = require('path');
const cwd = process.cwd();

let mergeFilesQueue = require('./mergeFilesQueue');

const buildType = get_buildType();
const ANU_ENV = get_ANU_ENV();
const BUILD_ENV = get_BUILD_ENV();

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
    //                         // 没用 delete，怕严格模式影响
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


/**
 * mergeSourceFile 仅用于合并属于源码类型的包（包中都是未打包前的代码）
 * 需要特殊处理的文件类型：lockFile、app.js、app.json、pkg.json
 */
export default function () {

    let queue = Array.from(mergeFilesQueue);
    validateAppJsFileCount(queue); // 校验 app.js 是否只存在一个
    validateConfigFileCount(queue); // 校验存在 xxConfig.json 路径是否正确且该文件的目录下是否存在 app.js
    validateMiniAppProjectConfigJson(queue); // 校验 projectConfig.json 是否只存在一个

    // 校验完开始合并，此处准备后续合并需要的元数据对象
    let map: any = generateMetaFilesMap(queue);
    /*
    {
        xconfig: [ // xxConfig.json
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_home_qunar/wxConfig.json',
                content: [Object]
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_qunar_platform/source/wxConfig.json',
                content: [Object]
            }
        ],
        alias: [ // app.json 中的 alias
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_home_qunar/app.json',
                content: [Object],
                type: 'alias'
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_debugger/source/app.json',
                content: {},
                type: 'alias'
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_qunar_platform/source/app.json',
                content: [Object],
                type: 'alias'
            }
        ],
        importSyntax: [],
        pkgDependencies: [ // package.json 中的 dependencies
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_home_qunar/package.json',
                content: [Object],
                type: 'dependencies'
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_qunar_platform/package.json',
                content: [Object],
                type: 'dependencies'
            }
        ],
        pkgDevDep: [ // package.json 中的 devDependencies
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_home_qunar/package.json',
                content: [Object],
                type: 'devDependencies'
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_debugger/package.json',
                content: {},
                type: 'devDependencies'
            },
            {
                id: '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_module_qunar_platform/package.json',
                content: [Object],
                type: 'devDependencies'
            }
        ],
        ignoreInstallPkg: [ // package.json 中的 nanachi.ignoreInstallPkg
            '^(eslint)',   '^(husky)',
            '^(jest)',     '^(lint-)',
            'sass-loader', 'jest-cli',
            'stylelint',   '^(babel)',
            'pre-commit',  'cross-env'
        ],
        projectConfigJson: [
            '/Users/qitmac001157/Desktop/nnc_module_qunar_platform/.CACHE/download/wx/nnc_home_qunar/project.config.json'
        ],
        pages: [ // source/pages 下的所有页面
            'pages/platform/indexWx/index',
            'pages/alonePlatform/subscribePage/index',
            'pages/platform/login/index',
            'pages/orderList/orderList/index',
            'pages/platform/userCenter/index',
            'pages/platform/myPage/index',
            'pages/orderList/noOrderList/index',
            'pages/alonePlatform/orderList/index',
            'pages/alonePlatform/noOrderList/index',
            'pages/alonePlatform/citySelect/index',
            'pages/alonePlatform/calendar/index',
            'pages/alonePlatform/coupon/list/index',
            'pages/alonePlatform/coupon/detail/index',
            'pages/alonePlatform/flight/index',
            'pages/alonePlatform/activeWebView/index',
            'pages/alonePlatform/marketWebView/index',
            'pages/alonePlatform/pay/index',
            'pages/alonePlatform/login/index',
            'pages/coupon/list/index',
            'pages/coupon/detail/index',
            'pages/platform/webView/index',
            'pages/alonePlatform/webView/index',
            'pages/alonePlatform/feedback/index',
            'pages/alonePlatform/realNameGuide/index',
            'pages/alonePlatform/pushMiddlePage/index',
            'pages/alonePlatform/wxPay/realNameAuth/index',
            'pages/alonePlatform/wxPay/payResult/index',
            'pages/alonePlatform/contact/list/index',
            'pages/alonePlatform/contact/editList/index',
            'flight/pages/h5/h5',
            'flight/pages/payOrder/payOrder',
            'flight/pages/orderDetail/orderDetail',
            'flight/pages/redirect/index',
            'flight/pages/middlePage/middlePage',
            'flight/pages/activity/activity',
            'pages/alonePlatform/actWebWx/index',
            'common/utils/hookUrl/index.js',
            'common/utils/hotelLog.js',
            'pages/ticketP/booking/booking',
            'pages/ticketP/detail/detail',
            'pages/ticketP/shop/shop',
            'pages/tripP/focusWechat/index',
            'pages/ppTrip/tripList/index',
            'pages/tripP/tripListOfTimeLine/index',
            'pages/tripP/tripShare/index',
            'pages/alonePlatform/loginAuth/index',
            'pages/platform/qPlay/index',
            'pages/alonePlatform/lowPriceAuth/index',
            'pages/alonePlatform/cqpay/holdpay/index',
            'pages/alonePlatform/cqpay/holdpayNew/index',
            'pages/alonePlatform/cqpay/holdpayDetail/index',
            'pages/alonePlatform/cqpay/protocol/index',
            'pages/debugger/home/index',
            'pages/debugger/setting/index'
        ]
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
