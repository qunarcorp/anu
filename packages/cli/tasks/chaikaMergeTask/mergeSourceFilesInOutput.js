"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const utils_1 = __importDefault(require("../../packages/utils"));
const isMutilePack_1 = require("./isMutilePack");
const generateAppJsonFromXConfigJson = require('../../packages/babelPlugins/generateAppJsonFromXConfigJson');
const { setSubPackage } = require('../../packages/utils/setSubPackage');
const { mergeConfigJson } = require('../../packages/utils/mergeConfigJson');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
function collectWaitedMergeFiles(dirPath) {
    const sourceConfigJsonExistedPath = mergeUtils_1.validateConfigJsonIsExistInSource(dirPath);
    const needMergeFileList = [];
    if (sourceConfigJsonExistedPath) {
        needMergeFileList.push(sourceConfigJsonExistedPath);
    }
    return needMergeFileList;
}
function getMergedXConfigContentReturnObject(config) {
    let ret = mergeUtils_1.xDiff(config);
    for (let i in ret) {
        if (i.toLocaleLowerCase() === 'subpackages') {
            ret[i] = mergeUtils_1.getUniqueSubPkgConfig(ret[i]);
        }
    }
    return ret;
}
function collectAllPagesFromAppJson(waitedMergeProjectDirList) {
    const res = [];
    waitedMergeProjectDirList.forEach((dir) => {
        const appJsonPath = path.join(dir, 'app.json');
        if (fs.existsSync(appJsonPath)) {
            const appJson = require(appJsonPath);
            if (appJson.pages && appJson.pages.length) {
                res.push(...appJson.pages);
            }
        }
    });
    return res;
}
function checkPluginAndDeleteName(xConfigJson) {
    if (xConfigJson.plugins && Object.keys(xConfigJson.plugins).length) {
        for (let item in xConfigJson.plugins) {
            if (xConfigJson.plugins[item].name) {
                delete xConfigJson.plugins[item].name;
            }
        }
    }
}
function traverseMergedXConfigToAppJson(map, waitedMergeProjectDirList) {
    if (!map.xconfig)
        return { dist: '', content: '' };
    let xConfigJson = getMergedXConfigContentReturnObject(map.xconfig);
    checkPluginAndDeleteName(xConfigJson);
    const finalAppJsonPath = path.join(utils_1.default.getFixedDistDir(false), isMutilePack_1.getMultiplePackDirPrefixNew(), 'app.json');
    let json = {};
    try {
        json = require(finalAppJsonPath);
    }
    catch (err) {
        console.error(chalk.red(`[traverseMergedXConfigToAppJson] 读取产物 app.json 失败，请联系开发者`));
        process.exit(1);
    }
    const redundantPages = collectAllPagesFromAppJson(waitedMergeProjectDirList);
    json.pages = json.pages.concat(redundantPages);
    setSubPackage(json, xConfigJson);
    json = mergeConfigJson(json);
    generateAppJsonFromXConfigJson(xConfigJson, json);
    return {
        dist: finalAppJsonPath,
        content: JSON.stringify(json, null, 4)
    };
}
function default_1(waitedMergeProjectDirList) {
    const needMergeFileList = Array.from(new Set([].concat(...waitedMergeProjectDirList.map(collectWaitedMergeFiles))));
    let map;
    if (needMergeFileList.length) {
        const finalDistPath = path.join(utils_1.default.getFixedDistDir(false), isMutilePack_1.getMultiplePackDirPrefixNew());
        map = mergeUtils_1.generateMetaFilesMap(Array.from(new Set([...needMergeFileList].concat(...collectWaitedMergeFiles(finalDistPath)))));
    }
    else {
        map = {};
    }
    return Promise.resolve(traverseMergedXConfigToAppJson(map, waitedMergeProjectDirList))
        .then(function ({ dist, content }) {
        return new Promise(function (res, rej) {
            if (!content) {
                res(1);
                return;
            }
            if (dist && content) {
                console.log(`[mergeSourceFilesInOutput] 预计覆写文件: ${dist}`);
                fs.ensureFileSync(dist);
                fs.writeFile(dist, content, function (err) {
                    if (err) {
                        rej(err);
                    }
                    else {
                        res(1);
                    }
                });
            }
            else {
                res(1);
            }
        });
    });
}
exports.default = default_1;
