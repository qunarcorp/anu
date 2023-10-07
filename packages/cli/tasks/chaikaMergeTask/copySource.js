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
const config_1 = __importDefault(require("../../config/config"));
const utils_1 = __importDefault(require("../../packages/utils"));
const isMutilePack_1 = require("./isMutilePack");
const chalk_1 = __importDefault(require("chalk"));
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
    'project.config.json',
    'project.swan.json',
    'mini.config.json',
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
    let projectList = [cwd];
    if (config_1.default.multiProject.length > 1) {
        projectList = projectList.concat(config_1.default.multiProject);
    }
    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];
        if (!fs_extra_1.default.existsSync(path.join(projectPath, 'source'))
            && !fs_extra_1.default.existsSync(path.join(projectPath, 'app.js'))) {
            return Promise.resolve(1);
        }
    }
    let allPromiseCopy = [];
    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];
        console.log(chalk_1.default.green(`正在拷贝项目：${projectPath}`));
        let projectDirName = projectPath.replace(/\\/g, '/').split('/').pop();
        let files = glob_1.default.sync('./!(node_modules|target|dist|src|sign|build|.CACHE|.chaika_cache|nanachi|sourcemap)', {
            cwd: projectPath,
        });
        const promiseCopy = files
            .map(function (el) {
            let src = path.join(projectPath, el);
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
        allPromiseCopy = allPromiseCopy.concat(promiseCopy);
    }
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
