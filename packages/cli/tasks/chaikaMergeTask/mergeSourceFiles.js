"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const installTasks_1 = require("./installTasks");
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const cwd = process.cwd();
let mergeFilesQueue = require('./mergeFilesQueue');
const buildType = mergeUtils_1.get_buildType();
const ANU_ENV = mergeUtils_1.get_ANU_ENV();
const BUILD_ENV = mergeUtils_1.get_BUILD_ENV();
const projectConfigJsonMap = {
    'wx': {
        reg: /\/project\.config\.json$/,
        fileName: 'project.config.json',
    },
    'bu': {
        reg: /\/project\.swan\.json$/,
        fileName: 'project.swan.json',
    },
    'ali': {
        reg: /\/mini\.config\.json$/,
        fileName: 'mini.config.json',
    },
};
function getMergedAppJsConent(appJsSrcPath, pages = [], importSyntax = []) {
    function getAppImportSyntaxCode(importSyntax = []) {
        let importSyntaxList = importSyntax.map(function (curEl) {
            curEl = curEl.trim();
            if (!/;$/.test(curEl)) {
                curEl = curEl + ';';
            }
            return curEl;
        });
        return importSyntaxList.length ? importSyntaxList.join("\n") + '\n' : '';
    }
    let allRoutesStr = pages.map(function (pageRoute) {
        if (!(/^\.\//.test(pageRoute))) {
            pageRoute = './' + pageRoute;
        }
        pageRoute = `import '${pageRoute}';\n`;
        return pageRoute;
    }).join('');
    allRoutesStr += getAppImportSyntaxCode(importSyntax);
    return new Promise(function (rel, rej) {
        let appJsSrcContent = '';
        let appJsDist = path.join(mergeUtils_1.getMergeDir(), 'source', 'app.js');
        try {
            appJsSrcContent = fs.readFileSync(appJsSrcPath).toString();
        }
        catch (err) {
            rej(err);
        }
        appJsSrcContent = allRoutesStr + appJsSrcContent;
        rel({
            content: appJsSrcContent,
            dist: appJsDist
        });
    });
}
function getAppJsSourcePath(queue = []) {
    let appJsSourcePath = queue.filter(function (file) {
        file = file.replace(/\\/g, '/');
        return /\/app\.js$/.test(file);
    })[0];
    return appJsSourcePath;
}
function generateMetaFilesMap(queue = []) {
    let map = {};
    let env = ANU_ENV;
    queue.forEach(function (file) {
        file = file.replace(/\\/g, '/');
        if (/\/package\.json$/.test(file)) {
            let { dependencies = {}, devDependencies = {}, nanachi = {} } = require(file);
            if (Object.keys(dependencies).length) {
                delete dependencies['@qnpm/chaika-patch'];
                map['pkgDependencies'] = map['pkgDependencies'] || [];
                map['pkgDependencies'].push({
                    id: file,
                    content: dependencies,
                    type: 'dependencies'
                });
            }
            if (Object.keys(devDependencies).length) {
                delete devDependencies['node-sass'];
                delete devDependencies['@qnpm/chaika-patch'];
                map['pkgDevDep'] = map['pkgDevDep'] || [];
                map['pkgDevDep'].push({
                    id: file,
                    content: devDependencies,
                    type: 'devDependencies'
                });
            }
            map.ignoreInstallPkg = map.ignoreInstallPkg || [];
            map.ignoreInstallPkg = map.ignoreInstallPkg.concat(nanachi.ignoreInstalledNpm || []);
            return;
        }
        if (/\/app\.json$/.test(file)) {
            const { alias = {}, pages = [], rules = [], imports = [], order = 0 } = require(file);
            if (alias) {
                map['alias'] = map['alias'] || [];
                map['alias'].push({
                    id: file,
                    content: alias,
                    type: 'alias'
                });
            }
            if (pages.length) {
                let allInjectRoutes = pages.reduce(function (ret, route) {
                    var _a;
                    let injectRoute = '';
                    if ('[object Object]' === Object.prototype.toString.call(route)) {
                        const supportPlat = route.platform.replace(/\s*/g, '').split(',');
                        const supportEnv = (_a = route.env) === null || _a === void 0 ? void 0 : _a.replace(/\s*/g, '').split(',');
                        if (supportPlat.includes(env)) {
                            if (!supportEnv || supportEnv.includes(BUILD_ENV)) {
                                injectRoute = route.route;
                            }
                        }
                    }
                    else {
                        injectRoute = route;
                    }
                    if (injectRoute) {
                        ret.add(injectRoute);
                    }
                    return ret;
                }, new Set());
                map['pages'] = map['pages'] || [];
                map['pages'].push({
                    routes: Array.from(allInjectRoutes),
                    order: order
                });
            }
            if (rules.length) {
                map['quickRules'] = map['quickRules'] || new Map();
                rules.forEach((curRule) => {
                    const selector = JSON.stringify(curRule);
                    if (map['quickRules'].has(selector)) {
                        console.log(chalk.yellow(`无法合并, ${file.split('download/').pop()} 中已经存在规则：\n${JSON.stringify(curRule, null, 4)}\n`));
                        return;
                    }
                    map['quickRules'].set(selector, 1);
                });
            }
            map['importSyntax'] = map['importSyntax'] || [];
            map['importSyntax'] = map['importSyntax'].concat(imports);
            return;
        }
        const projectConfigReg = (projectConfigJsonMap[buildType] || projectConfigJsonMap.wx).reg;
        if (projectConfigReg.test(file)) {
            map['projectConfigJson'] = map['projectConfigJson'] || [];
            map['projectConfigJson'].push(file);
        }
        const reg = new RegExp(env + 'Config.json$');
        map['xconfig'] = map['xconfig'] || [];
        if (reg.test(file)) {
            try {
                const config = require(file);
                if (config) {
                    map['xconfig'].push({
                        id: file,
                        content: config
                    });
                }
            }
            catch (err) {
            }
        }
    });
    map = mergeUtils_1.orderRouteByOrder(map);
    return map;
}
function getUniqueSubPkgConfig(list = []) {
    return list.reduce(function (initList, curEle) {
        let curName = curEle.name;
        let hasEle = initList.some(function (el) {
            return el.name === curName;
        });
        if (!hasEle)
            initList.push(curEle);
        return initList;
    }, []);
}
function getMergedXConfigContent(config) {
    let env = ANU_ENV;
    let xConfigJsonDist = path.join(mergeUtils_1.getMergeDir(), 'source', `${env}Config.json`);
    let ret = mergeUtils_1.xDiff(config);
    for (let i in ret) {
        if (i.toLocaleLowerCase() === 'subpackages') {
            ret[i] = getUniqueSubPkgConfig(ret[i]);
        }
    }
    const skipConfigPath = mergeUtils_1.getDownLoadHomeDir(env);
    console.log('skipConfigPath:', skipConfigPath);
    const skipEnv = process.env.SKIP;
    if (fs.existsSync(skipConfigPath)) {
        console.log(`识别到 nnc_home_qunar 中包含 ${env}SkipConfig.json 文件，skipEnv=${skipEnv}，准备执行配置过滤任务`);
        const skipConfig = require(skipConfigPath);
        for (let key in skipConfig) {
            if (key === skipEnv) {
                const skipConfigObj = skipConfig[key];
                for (let skipItemKey in skipConfigObj) {
                    if (skipItemKey === 'plugins') {
                        let retPlugin = ret.plugins;
                        if (retPlugin) {
                            let filteredObject = {};
                            for (let retPluginKey in retPlugin) {
                                if (skipConfigObj[skipItemKey].includes(retPluginKey)) {
                                }
                                else {
                                    filteredObject[retPluginKey] = retPlugin[retPluginKey];
                                }
                            }
                            ret.plugins = filteredObject;
                        }
                    }
                    if (skipItemKey === 'requiredPrivateInfos') {
                        const retRequiredPrivateInfos = ret.requiredPrivateInfos;
                        if (retRequiredPrivateInfos) {
                            for (let i = 0; i < retRequiredPrivateInfos.length; i++) {
                                if (skipConfigObj[skipItemKey].includes(retRequiredPrivateInfos[i])) {
                                    ret.requiredPrivateInfos.splice(i, 1);
                                }
                            }
                        }
                    }
                }
            }
            else {
                console.log(`skipEnv=${skipEnv}，在 ${env}SkipConfig.json 文件中没有找到对应的配置，跳过过滤任务`);
            }
        }
    }
    else {
        console.log(`skipEnv=${skipEnv}，在路径 ${skipConfigPath} 下没有找到过滤配置文件，跳过过滤任务`);
    }
    return Promise.resolve({
        dist: xConfigJsonDist,
        content: JSON.stringify(ret, null, 4)
    });
}
function getSitemapContent(quickRules) {
    if (!quickRules) {
        return Promise.resolve({
            content: ''
        });
    }
    const rulesList = Array.from(quickRules).map((el) => {
        return el[0];
    });
    const content = JSON.stringify({ rules: rulesList });
    return Promise.resolve({
        dist: path.join(mergeUtils_1.getMergeDir(), 'source/sitemap.json'),
        content
    });
}
function getMergedPkgJsonContent(alias) {
    let currentPkg = require(path.join(cwd, 'package.json'));
    let distContent = Object.assign({}, currentPkg, {
        nanachi: {
            alias: alias
        }
    });
    let dist = path.join(mergeUtils_1.getMergeDir(), 'package.json');
    return {
        dist: dist,
        content: JSON.stringify(distContent, null, 4)
    };
}
function getMiniAppProjectConfigJson(projectConfigQueue = []) {
    const projectConfigFileName = (projectConfigJsonMap[buildType] || projectConfigJsonMap.wx).fileName;
    let dist = path.join(mergeUtils_1.getMergeDir(), projectConfigFileName);
    let distContent = '';
    if (projectConfigQueue.length) {
        const configJson = require(projectConfigQueue[0]);
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
function default_1() {
    let queue = Array.from(mergeFilesQueue);
    mergeUtils_1.validateAppJsFileCount(queue);
    mergeUtils_1.validateConfigFileCount(queue);
    mergeUtils_1.validateMiniAppProjectConfigJson(queue);
    let map = generateMetaFilesMap(queue);
    let tasks = [
        getMergedAppJsConent(getAppJsSourcePath(queue), map.pages, map.importSyntax),
        getMergedXConfigContent(map.xconfig),
        getMergedPkgJsonContent(mergeUtils_1.getMergedData(map.alias)),
        getMiniAppProjectConfigJson(map.projectConfigJson),
    ];
    if (ANU_ENV === 'quick') {
        tasks.push(getSitemapContent(map.quickRules));
    }
    installTasks_1.execSyncInstallTasks(map);
    return Promise.all(tasks)
        .then(function (queue) {
        queue = queue.map(function ({ dist, content }) {
            return new Promise(function (rel, rej) {
                if (!content) {
                    rel(1);
                    return;
                }
                fs.ensureFileSync(dist);
                fs.writeFile(dist, content, function (err) {
                    if (err) {
                        rej(err);
                    }
                    else {
                        rel(1);
                    }
                });
            });
        });
        return Promise.all(queue);
    });
}
exports.default = default_1;
