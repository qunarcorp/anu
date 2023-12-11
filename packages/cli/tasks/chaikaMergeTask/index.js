"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const copySource_1 = __importDefault(require("./copySource"));
const mergeSourceFiles_1 = __importDefault(require("./mergeSourceFiles"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const isMutilePack_1 = require("./isMutilePack");
const config_1 = __importDefault(require("../../config/config"));
const copySingleBundleDist_1 = __importDefault(require("./copySingleBundleDist"));
const mergeSourceFilesInOutput_1 = __importDefault(require("./mergeSourceFilesInOutput"));
const utils_1 = __importDefault(require("../../packages/utils"));
const chalk_1 = __importDefault(require("chalk"));
const glob_1 = __importDefault(require("glob"));
const cwd = process.cwd();
function changeWorkingDir() {
    process.chdir(path.join(cwd, '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix()));
}
function makeSymLink() {
    let currentNpmDir = path.join(cwd, 'node_modules');
    let targetNpmDir = path.join(cwd, '.CACHE/nanachi', isMutilePack_1.getMultiplePackDirPrefix(), 'node_modules');
    if (!fs.existsSync(targetNpmDir)) {
        fs.symlinkSync(currentNpmDir, targetNpmDir);
        return;
    }
}
function filterOnlyDirOnTypeList(list) {
    return list.map((el) => {
        const from = el.path;
        const to = path.join(utils_1.default.getFixedDistDir(false), isMutilePack_1.getMultiplePackDirPrefixNew());
        const dirList = fs.readdirSync(from).filter((el) => {
            const stat = fs.statSync(path.join(from, el));
            return stat.isDirectory();
        }).map((el) => {
            return path.join(from, el, '**');
        });
        const globList = dirList.reduce((acc, cur) => {
            const files = glob_1.default.sync(cur, { nodir: true });
            return [...acc, ...files];
        }, []);
        return { from, to, globList };
    });
}
function getParamsFromProjectSourceTypeList() {
    const { projectSourceTypeList } = config_1.default;
    const projectSourceTypeListOutput = projectSourceTypeList.filter((item) => item.sourceType === 'output');
    return filterOnlyDirOnTypeList(projectSourceTypeListOutput);
}
function getParamsFromWorkSpaceCopyTask() {
    const projectSourceTypeListOutput = [];
    const name = require(path.join(utils_1.default.getProjectRootPath(), 'package.json')).name;
    const currentSingleBundlePath = path.join(utils_1.default.getDistDir(), isMutilePack_1.getMultiplePackDirPrefixNew());
    projectSourceTypeListOutput.push({
        name,
        path: currentSingleBundlePath,
        sourcemap: utils_1.default.getDisSourceMapDir(),
        sourceType: 'output'
    });
    return filterOnlyDirOnTypeList(projectSourceTypeListOutput);
}
function getParamsFromSourcemapPath(list) {
    return list.map((sourcemapPath) => {
        const from = sourcemapPath;
        const to = utils_1.default.getDisSourceMapDir();
        const globList = glob_1.default.sync(from + '/**', { nodir: true });
        return { from, to, globList };
    });
}
function setProjectSourceTypeList() {
    const jsonPath = path.join(cwd, `.CACHE/type${isMutilePack_1.getMultiplePackDirPrefix()}.json`);
    if (fs.existsSync(jsonPath)) {
        try {
            const json = require(jsonPath);
            config_1.default.projectSourceTypeList = json.projectSourceTypeList;
        }
        catch (err) {
            console.log(chalk_1.default.red(`[setProjectSourceTypeList] 读取 ${jsonPath} 文件失败，请联系开发者`));
            process.exit(1);
        }
    }
}
const runChaikaMergeTask = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        setProjectSourceTypeList();
        yield copySource_1.default();
        yield mergeSourceFiles_1.default();
        makeSymLink();
        changeWorkingDir();
    }
    catch (err) {
        console.log('chaika merge error:', err);
    }
});
exports.runChaikaMergeTask = runChaikaMergeTask;
const runOutputCacheCodesMergeTask = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const copyList = getParamsFromProjectSourceTypeList();
        const allCopyTasks = copyList.map(({ from, to, globList }) => {
            console.log(`[runOutputCacheCodesMergeTask] 准备合并的项目路径: ${from} -> ${to}`);
            return copySingleBundleDist_1.default(from, to, globList);
        });
        yield Promise.all(allCopyTasks);
    }
    catch (err) {
        console.log('[runOutputCacheCodesMergeTask] Merge error:', err);
    }
});
exports.runOutputCacheCodesMergeTask = runOutputCacheCodesMergeTask;
const runSingleBundleWatchCacheMergeTask = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const copyList = getParamsFromWorkSpaceCopyTask();
        const allCopyTasks = copyList.map(({ from, to, globList }) => {
            console.log(`[runSingleBundleWatchCacheMergeTask] 准备合并的项目路径: ${from} -> ${to}`);
            return copySingleBundleDist_1.default(from, to, globList);
        });
        yield Promise.all(allCopyTasks);
    }
    catch (err) {
        console.log('[runSingleBundleWatchCacheMergeTask] Merge error:', err);
    }
});
exports.runSingleBundleWatchCacheMergeTask = runSingleBundleWatchCacheMergeTask;
const runOutputSourceConfigMergeTask = (list) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mergeSourceFilesInOutput_1.default(list);
    }
    catch (err) {
        console.log('[runOutputSourceConfigMergeTask] Merge error:', err);
    }
});
exports.runOutputSourceConfigMergeTask = runOutputSourceConfigMergeTask;
const runSourceConfigMoveTask = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const copyList = ['app.json', `${config_1.default.buildType}Config.json`].map((el) => {
            const filePossiblePath = path.join(utils_1.default.getProjectRootPath(), 'source', el);
            if (fs.existsSync(filePossiblePath)) {
                return {
                    from: filePossiblePath,
                    to: path.join(utils_1.default.getDistDir(), isMutilePack_1.getMultiplePackDirPrefixNew(), el)
                };
            }
        });
        const allCopyTasks = copyList.map(({ from, to }) => {
            console.log(`[runSourceConfigMoveTask] 准备复制的json配置文件: ${from} -> ${to}`);
            return fs.copyFile(from, to);
        });
        yield Promise.all(allCopyTasks);
    }
    catch (err) {
        console.log('[runSourceConfigMoveTask] Move error:', err);
    }
});
exports.runSourceConfigMoveTask = runSourceConfigMoveTask;
const runSourcemapMergeTask = (list) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const copyList = getParamsFromSourcemapPath(list);
        const allCopyTasks = copyList.map(({ from, to, globList }) => {
            console.log(`[runSourcemapMergeTask] 准备合并的项目路径: ${from} -> ${to}`);
            return copySingleBundleDist_1.default(from, to, globList);
        });
        yield Promise.all(allCopyTasks);
    }
    catch (err) {
        console.log('[runSourcemapMergeTask] Merge error:', err);
    }
});
exports.runSourcemapMergeTask = runSourcemapMergeTask;
