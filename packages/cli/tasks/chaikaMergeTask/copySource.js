"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const glob_1 = __importDefault(require("glob"));
const path = __importStar(require("path"));
const utils_1 = __importDefault(require("../../packages/utils"));
const isMutilePack_1 = require("./isMutilePack");
const cwd = process.cwd();
const downLoadDir = path.join(cwd, '.CACHE/download');
const mergeFilesQueue = require('./mergeFilesQueue');
const ignoreFiles = [
    'package-lock.json'
];
const ignoreExt = ['.tgz', '.log', 'rpks'];
const docFilesReg = /\.md$/;
const configFileReg = /\w+Config\.json$/;
const reactFileReg = /React\w+\.js$/;
const mergeFiles = [
    'app.json',
    'app.js',
    'package.json'
];
const lockFiles = [
    'project.config.json'
];
function getDownLoadDir() {
    return path.join(utils_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix());
}
function getMergeDir() {
    return path.join(utils_1.default.getProjectRootPath(), '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix());
}
function isIgnoreFile(fileName) {
    return ignoreFiles.includes(fileName)
        || mergeFiles.includes(fileName)
        || lockFiles.includes(fileName)
        || ignoreExt.includes(path.parse(fileName).ext)
        || configFileReg.test(fileName)
        || reactFileReg.test(fileName)
        || docFilesReg.test(fileName);
}
function isMergeFile(fileName) {
    return mergeFiles.includes(fileName)
        || configFileReg.test(fileName);
}
function isLockFile(fileName) {
    return lockFiles.includes(fileName);
}
function copyCurrentProjectToDownLoad() {
    if (!fs_extra_1.default.existsSync(path.join(cwd, 'source'))
        && !fs_extra_1.default.existsSync(path.join(cwd, 'app.js'))) {
        return Promise.resolve(1);
    }
    let projectDirName = cwd.replace(/\\/g, '/').split('/').pop();
    let files = glob_1.default.sync('./!(node_modules|target|dist|src|sign|build|.CACHE|.chaika_cache|nanachi|sourcemap)', {});
    let allPromiseCopy = files
        .map(function (el) {
        let src = path.join(cwd, el);
        let dist = path.join(getDownLoadDir(), projectDirName, el);
        if (/\.\w+$/.test(el)) {
            fs_extra_1.default.ensureFileSync(dist);
            return fs_extra_1.default.copyFile(src, dist);
        }
        else {
            fs_extra_1.default.ensureDirSync(dist);
            return fs_extra_1.default.copy(src, dist);
        }
    });
    return Promise.all(allPromiseCopy);
}
function copyDownLoadToNnc() {
    let files = glob_1.default.sync(getDownLoadDir() + '/**', { nodir: true });
    files = files.filter((file) => {
        let fileName = path.parse(file).base;
        if (isIgnoreFile(fileName)) {
            if (isMergeFile(fileName) || isLockFile(fileName)) {
                mergeFilesQueue.add(file);
            }
            return false;
        }
        else {
            return true;
        }
    });
    let allPromiseCopy = files.map(function (file) {
        let dist = '';
        file = file.replace(/\\/g, '/');
        if (/\/source\//.test(file)) {
            dist = path.join(getMergeDir(), 'source', file.split('/source/').pop());
        }
        else {
            dist = path.join(getMergeDir(), file.split('/').pop());
        }
        fs_extra_1.default.ensureFileSync(dist);
        return fs_extra_1.default.copyFile(file, dist);
    });
    return Promise.all(allPromiseCopy);
}
function default_1() {
    return copyCurrentProjectToDownLoad()
        .then(function () {
        return copyDownLoadToNnc();
    })
        .then(function () {
        return Promise.resolve(1);
    })
        .catch(function (err) {
        return Promise.reject(err);
    });
}
exports.default = default_1;
;
