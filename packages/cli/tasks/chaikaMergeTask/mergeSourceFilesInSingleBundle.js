"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const fs = require('fs-extra');
function collectWaitedMergeFiles(dirPath) {
    const sourceAppJsonExistedPath = mergeUtils_1.validateAppJsonIsExistInSource(dirPath);
    const sourceConfigJsonExistedPath = mergeUtils_1.validateConfigJsonIsExistInSource(dirPath);
    const needMergeFileList = [];
    if (sourceAppJsonExistedPath) {
        needMergeFileList.push(sourceAppJsonExistedPath);
    }
    if (sourceConfigJsonExistedPath) {
        needMergeFileList.push(sourceConfigJsonExistedPath);
    }
    return needMergeFileList;
}
function default_1(waitedMergeProjectDirList) {
    const needMergeFileList = Array.from(new Set(waitedMergeProjectDirList.map(collectWaitedMergeFiles).flat()));
    let map = mergeUtils_1.generateMetaFilesMap(needMergeFileList);
    console.log('new map:', map);
    let tasks = [
        getMergedXConfigContent(map.config),
        getMerged
    ];
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
