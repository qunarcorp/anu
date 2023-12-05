import fs from 'fs-extra';
import glob from 'glob';
import * as path from 'path';
import config from '../../config/config';
import utils from '../../packages/utils';
import {getMultiplePackDirPrefix} from './isMutilePack';

const chalk = require('chalk');
const mergeFilesQueue = require('./mergeFilesQueue');

//这些文件对项目编译时来说，没啥用
const ignoreFiles: any = [
    'package-lock.json'
];

const ignoreExt = ['.tgz', '.log', 'rpks'];

const docFilesReg = /\.md$/;
const configFileReg = /\w+Config\.json$/;
const reactFileReg = /React\w+\.js$/;

//这些文件需要经过其他处理
const mergeFiles: any = [
    'app.json',
    'app.js',
    // 'app.tsx',
    'package.json'
];

//这种文件全局只能有一个, 不参与合并
const lockFiles: any = [
    'project.config.json',
    'project.swan.json',
    'mini.config.json',
];

function getDownLoadDir() {
    return path.join(utils.getProjectRootPath(), '.CACHE/download', getMultiplePackDirPrefix());
}

function getMergeDir() {
    return path.join(utils.getProjectRootPath(), '.CACHE/nanachi', getMultiplePackDirPrefix());
}

function isIgnoreFile(fileName: string){
    return ignoreFiles.includes(fileName)
        || mergeFiles.includes(fileName)
        || lockFiles.includes(fileName)
        || ignoreExt.includes(path.parse(fileName).ext)
        || configFileReg.test(fileName)
        || reactFileReg.test(fileName)
        || docFilesReg.test(fileName)
}

function isMergeFile(fileName: string){
    return mergeFiles.includes(fileName)
        || configFileReg.test(fileName);
}

function isLockFile(fileName: string) {
    return lockFiles.includes(fileName);
}

function generateCopyProjectList() {
    const projectList = Array.from(config.projectWatcherList);

    // 校验 projectList
    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];
        // 如果当前目录不存在source目录，并且不存在app.js, 那可能是个非nanachi工程目录
        if (
            !fs.existsSync(path.join(projectPath, 'source'))
            && !fs.existsSync(path.join(projectPath, 'app.js'))
        ) {
            console.log(`[generateCopyProjectList] 目录 ${projectPath} 的校验未通过，请联系开发者`);
            process.exit(1);
        }
    }

    return projectList;
}

/**
 * 拷贝工作区项目到下载缓存区
 */
function copyCurrentProjectToDownLoad(): Promise<any> {
    // 单包模式下，启动的另一打包基座代码的进程会指定该参数，则跳过当前工作区项目的拷贝
    if (config.noCurrent) {
        return Promise.resolve(1);
    }

    const projectList = generateCopyProjectList();

    // 获取待复制文件路径，创建复制任务
    let allPromiseCopy: Array<Promise<void>> = [];
    const finalProjectList = []; // 记录复制后的实际工程地址
    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];

        // console.log(chalk.green(`正在拷贝项目：${projectPath}`));

        let projectDirName = projectPath.replace(/\\/g, '/').split('/').pop();
        let files = glob.sync( './!(node_modules|target|dist|src|sign|build|.CACHE|.chaika_cache|nanachi|sourcemap)', {
            cwd: projectPath,
        });

        finalProjectList.push(path.join(getDownLoadDir(),projectDirName));
        const promiseCopy = files
            .map(function(el) {
                let src = path.join(projectPath, el);
                let dist = path.join(
                    getDownLoadDir(),
                    projectDirName,
                    el
                );
                if (/\.\w+$/.test(el)) {
                    fs.ensureFileSync(dist);
                    return fs.copyFile(src, dist);
                } else {
                    fs.ensureDirSync(dist);
                    return fs.copy(src, dist);
                }
            });

        allPromiseCopy = allPromiseCopy.concat(promiseCopy);
    }

    // 如果进行了拷贝，那么需要把当前拷贝项目的元数据写入 userConfig，保证下一步 copy 获取所有的目录列表
    setCurrentProjectType(finalProjectList);
    return Promise.all(allPromiseCopy);
}

// 参考 setProjectSourceTypeList
// copy 完成存在当前工作区项目真实目录后，把元数据写入 userConfig
function setCurrentProjectType (projectList: string[]) {
    // console.log('projectList', projectList);
    projectList.forEach(function (projectPath: string) {
        const pkgPath = path.join(projectPath, 'package.json');
        const pkg = require(pkgPath);

        // 如果 config.projectSourceTypeList 存在同名的，那么直接覆盖，否则新增
        // 这里是为了应对 pkg 中依然写入当前工作区的包名，既被下载又被复制
        const index = config.projectSourceTypeList.findIndex(function (el) {
            return el.name === pkg.name;
        });
        if (index > -1) {
            config.projectSourceTypeList[index] = {
                name: pkg.name,
                path: projectPath,
                sourceType: 'input'
            };
        } else {
            config.projectSourceTypeList.push({
                name: pkg.name,
                path: projectPath,
                sourceType: 'input'
            });
        }
    });
}

function copyDownLoadToNnc() {
    // 获取 config.projectSourceTypeList 中的内容进行合并操作
    const needMergeProjectList = config.projectSourceTypeList.filter(function (el) {
        return el.sourceType === 'input'; // 只提取源码类型的，产物类型不进行合并，而是在打包完进行合并
    });

    // 只在指定 needMergeProjectList 目录下进行 glob 查找
    let files = needMergeProjectList.map(function (el) {
        // 校验 path，不能为空，否则 glob 会遍历电脑上的所有文件
        if (!el.path) {
            console.log(chalk.red(`[copyDownLoadToNnc] 项目 ${el.name} 的 path 元数据为空，请联系开发者`));
            process.exit(1);
        }
        return glob.sync(
            path.join(el.path, '/**'),
            { nodir: true }
        );
    }).reduce(function (prev, next) {
        return prev.concat(next);
    }, []);

    files = files.filter((file)=>{
        let fileName = path.parse(file).base;
        if (isIgnoreFile(fileName)) {
            if (isMergeFile(fileName) || isLockFile(fileName) ) {
                mergeFilesQueue.add(file); // 是忽略文件，但是属于需要特殊处理那一拨
            }
            return false; // 是忽略文件
        } else {
            return true; // 不是忽略的文件，且不需要特殊处理，直接拷贝
        }
    });

    let allPromiseCopy = files.map(function(file){
        let dist = '';
        file = file.replace(/\\/g, '/');

        if (/\/source\//.test(file)) { // 合并后进入 source 的文件
            dist = path.join(getMergeDir(), 'source', file.split('/source/').pop());
        } else {
            dist = path.join(getMergeDir(), file.split('/').pop());
        }

        fs.ensureFileSync(dist);
        return fs.copyFile(file, dist);
    });

    return Promise.all(allPromiseCopy);
}

export default function(){
    // fs.emptyDirSync(getMergeDir());
    return copyCurrentProjectToDownLoad()
        .then(function(){
            return copyDownLoadToNnc();
        })
        .then(function(){
            // console.log('[copyCurrentProjectToDownLoad] 拷贝完成');
            return Promise.resolve(1);
        })
        .catch(function(err){
            // console.log('[copyCurrentProjectToDownLoad] 拷贝失败');
            return Promise.reject(err);
        });
}
