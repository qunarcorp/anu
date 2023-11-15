import fs from 'fs-extra';
import glob from 'glob';
import * as path from 'path';
import config from '../../config/config';
import utils from '../../packages/utils';
import {getMultiplePackDirPrefix} from './isMutilePack';
import chalk from 'chalk';
const cwd = process.cwd();
const downLoadDir = path.join(cwd, '.CACHE/download');
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


/**
 * 拷贝工作区项目到下载缓存区
 */
function copyCurrentProjectToDownLoad(): Promise<any> {

    let projectList = [cwd];
    if (config.multiProject.length > 0) {
        projectList = projectList.concat(config.multiProject);
    }

    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];
        // 如果当前目录不存在source目录，并且不存在app.js, 那可能是个非nanachi工程目录
        if (
            !fs.existsSync(path.join(projectPath, 'source'))
            && !fs.existsSync(path.join(projectPath, 'app.js'))
        ) {
            return Promise.resolve(1);
        }
    }

    // 获取待复制文件路径，创建复制任务
    let allPromiseCopy: Array<Promise<void>> = [];
    for (let i = 0; i < projectList.length; i++) {
        const projectPath = projectList[i];

        // console.log(chalk.green(`正在拷贝项目：${projectPath}`));

        let projectDirName = projectPath.replace(/\\/g, '/').split('/').pop();
        let files = glob.sync( './!(node_modules|target|dist|src|sign|build|.CACHE|.chaika_cache|nanachi|sourcemap)', {
            cwd: projectPath,
        });

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

    return Promise.all(allPromiseCopy);
}



function copyDownLoadToNnc() {
    let files = glob.sync(
        getDownLoadDir()  + '/**',
        {nodir: true}
    );


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
            return Promise.resolve(1);
        })
        .catch(function(err){
            return Promise.reject(err);
        });
}
