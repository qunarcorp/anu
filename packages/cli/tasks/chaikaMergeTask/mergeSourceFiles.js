"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const consts_1 = require("../../consts");
const installTasks_1 = require("./installTasks");
const utils_1 = __importDefault(require("../../packages/utils"));
const config_1 = __importDefault(require("../../config/config"));
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
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
function addWorkSpaceImportAndAlias(map) {
    const workSpaceAppJsonPath = path.join(utils_1.default.getWorkSpaceSourceDirPath(), 'app.json');
    if (fs.existsSync(workSpaceAppJsonPath)) {
        let workSpaceAppJson;
        try {
            workSpaceAppJson = require(workSpaceAppJsonPath);
        }
        catch (err) {
            console.log(chalk.red('[addWorkSpaceImportAndAlias] 工作区 app.json 解析失败，请联系 nanachi 开发者'));
            process.exit(1);
        }
        const alias = workSpaceAppJson.alias || {};
        const importSyntax = workSpaceAppJson.imports || [];
        importSyntax.forEach((el, index) => {
            importSyntax[index] = `/* nanachi-ignore-dependency */${el}`;
        });
        map.alias = map.alias || [];
        map.alias.push({
            id: workSpaceAppJsonPath,
            content: alias,
            type: 'alias'
        });
        map.importSyntax = map.importSyntax || [];
        map.importSyntax = map.importSyntax.concat(importSyntax);
    }
    else {
        console.log(chalk.yellow('[addWorkSpaceImportAndAlias] 工作区 app.json 不存在，跳过处理'));
    }
}
function default_1() {
    let queue = Array.from(mergeFilesQueue);
    mergeUtils_1.validateAppJsFileCount(queue);
    mergeUtils_1.validateConfigFileCount(queue);
    mergeUtils_1.validateMiniAppProjectConfigJson(queue);
    let map = mergeUtils_1.generateMetaFilesMap(queue);
    if (config_1.default.noCurrent) {
        addWorkSpaceImportAndAlias(map);
    }
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
