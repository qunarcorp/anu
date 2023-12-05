"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const consts_1 = require("../../consts");
const installTasks_1 = require("./installTasks");
const fs = require('fs-extra');
const path = require('path');
const cwd = process.cwd();
let mergeFilesQueue = require('./mergeFilesQueue');
const buildType = mergeUtils_1.get_buildType();
const ANU_ENV = mergeUtils_1.get_ANU_ENV();
const BUILD_ENV = mergeUtils_1.get_BUILD_ENV();
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
function getMergedXConfigContent(config) {
    let env = ANU_ENV;
    let xConfigJsonDist = path.join(mergeUtils_1.getMergeDir(), 'source', `${env}Config.json`);
    let ret = mergeUtils_1.xDiff(config);
    for (let i in ret) {
        if (i.toLocaleLowerCase() === 'subpackages') {
            ret[i] = mergeUtils_1.getUniqueSubPkgConfig(ret[i]);
        }
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
    const projectConfigFileName = (consts_1.projectConfigJsonMap[buildType] || consts_1.projectConfigJsonMap.wx).fileName;
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
    let map = mergeUtils_1.generateMetaFilesMap(queue);
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
