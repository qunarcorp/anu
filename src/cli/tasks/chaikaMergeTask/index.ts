import copySource from './copySource';
import mergeSourceFiles from './mergeSourceFiles';
import * as path from 'path';
import * as fs from 'fs-extra';
import {getMultiplePackDirPrefix, getMultiplePackDirPrefixNew} from './isMutilePack';
import config, {projectSourceType} from '../../config/config';
import copySingleBundleToFullBundle from './copySingleBundleDist';
import mergeSourceFilesInOutput from "./mergeSourceFilesInOutput";
import utils from '../../packages/utils';
import chalk from 'chalk';
import glob from 'glob';

const cwd = process.cwd();

// chaika 合并完毕后，进程工作目录要切换到 .CACHE/nanachi/xx 下，方便进行下一部分 webpack.build
function changeWorkingDir(){
    process.chdir(path.join(cwd, '.CACHE/nanachi',  getMultiplePackDirPrefix()));
}

/**
 * 将工作区的 node_modules 链接到合并缓存区，作为打包依赖
 */
function makeSymLink(){
    let currentNpmDir = path.join(cwd, 'node_modules');
    let targetNpmDir = path.join(cwd, '.CACHE/nanachi', getMultiplePackDirPrefix(), 'node_modules');

    // 如果没有软连接目录，则创建
    // 所有依赖安装到用户工程目录node_modules
    // 但各拆库合并后的工程是在.CACHE/nanachi里
    if (!fs.existsSync(targetNpmDir)) {
        fs.symlinkSync(currentNpmDir , targetNpmDir);
        return;
    }
}

// 根据 from 设置 globList， 仅处理 from 下文件夹下的文件，如果 from 有直接的文件，则不包含在 globList 中
// 例如处理 /from/io/index.js  /from/pp/**   但不处理   /from/index.js    /from/react.json
// 这么做主要是规避子包复制时出现一些不可控的根目录文件，例如 reactX.js、 xConfig.json、 app.json 等，这类文件或不需要复制，或需要独立处理
function filterOnlyDirOnTypeList(list: projectSourceType[]) {
    return list.map((el) => {
        const from = el.path;
        // 这里写死 to 的原因是，即使是因为执行的模式不同，虽然间接产物的目录路径多种多样，但是这里的指向的应该一直是不带 Suffix 的路径
        const to = path.join(utils.getFixedDistDir(false), getMultiplePackDirPrefixNew());

        const dirList = fs.readdirSync(from).filter((el) => {
            const stat = fs.statSync(path.join(from, el));
            return stat.isDirectory();
        }).map((el) => {
            return path.join(from, el, '**');
        });

        const globList = dirList.reduce((acc, cur) => {
            const files = glob.sync(cur, {nodir: true});
            return [...acc, ...files];
        }, []);

        return { from, to, globList };
    });
}

/**
 * 从 userconfig 获取，需要复制的文件的来源，以及目标路径，以及可选指定的来源目录下的过滤列表
 */
function getParamsFromProjectSourceTypeList() {
    const { projectSourceTypeList} = config;
    const projectSourceTypeListOutput = projectSourceTypeList.filter((item) => item.sourceType === 'output');

    return filterOnlyDirOnTypeList(projectSourceTypeListOutput);
}

/**
 * 单包模式下，仅从工作区代码中获取，需要复制的文件的来源，以及目标路径，以及可选指定的来源目录下的过滤列表
 */
function getParamsFromWorkSpaceCopyTask() {
    const projectSourceTypeListOutput: projectSourceType[] = [];

    const name = require(path.join(utils.getProjectRootPath(), 'package.json')).name;
    const currentSingleBundlePath = path.join(utils.getDistDir(), getMultiplePackDirPrefixNew());
    projectSourceTypeListOutput.push({
        name,
        path: currentSingleBundlePath,
        sourceType: 'output'
    });

    return filterOnlyDirOnTypeList(projectSourceTypeListOutput);
}

/**
 * 将本地 ProjectSourceTypeList 文件内容读取到 userConfig 中供后续流程使用（比如 copySource）
 */
function setProjectSourceTypeList() {
    const jsonPath = path.join(cwd, `.CACHE/type${getMultiplePackDirPrefix()}.json`);

    // 判断存在内容，存在则写入 json.projectSourceTypeList 到 config 中
    // 此处只插入非工作区的那些项目的元数据
    if (fs.existsSync(jsonPath)) {
        try {
            const json = require(jsonPath);
            config.projectSourceTypeList = json.projectSourceTypeList;
        } catch (err) {
            console.log(chalk.red(`[setProjectSourceTypeList] 读取 ${jsonPath} 文件失败，请联系开发者`));
            process.exit(1);
        }
    }
}

// chaika 模式下打包前执行源码合并的任务
const runChaikaMergeTask = async () => {
    try {
        // 根据 nanachi install 的文件生成 config.projectSourceTypeList
        setProjectSourceTypeList();
        // copy 资源，只剩下需要特殊处理的合并文件在下一步处理
        await copySource();
        // 合并下载缓存区的文件
        await mergeSourceFiles();
        //创建软连接
        makeSymLink();
        changeWorkingDir();
    } catch (err) {
        // eslint-disable-next-line
        console.log('chaika merge error:',err);
    }
};

// 基座代码打包完，执行下载缓存区其余产物类型代码合并的任务（包含可能的单包打包产物，以及 nanachi install 下载的产物类型缓存）
// 此外 watch 模式下，子进程也会执行该任务，将产物类型源码同步到 dist 目录
const runOutputCacheCodesMergeTask = async () => {
    try {
        const copyList = getParamsFromProjectSourceTypeList();

        const allCopyTasks = copyList.map(({from, to, globList}) => {
            // @ts-ignore
            console.log(`[runOutputCacheCodesMergeTask] 准备合并的项目路径: ${from} -> ${to}`);
            return copySingleBundleToFullBundle(from, to, globList);
        });

        await Promise.all(allCopyTasks);
    } catch (err) {
        console.log('[runOutputCacheCodesMergeTask] Merge error:',err);
    }
};

// 单包watch模式下，单包打包产物的合并
const runSingleBundleWatchCacheMergeTask = async () => {
    try {
        const copyList = getParamsFromWorkSpaceCopyTask();

        const allCopyTasks = copyList.map(({from, to, globList}) => {
            // @ts-ignore
            console.log(`[runSingleBundleWatchCacheMergeTask] 准备合并的项目路径: ${from} -> ${to}`);
            return copySingleBundleToFullBundle(from, to, globList);
        });

        await Promise.all(allCopyTasks);
    } catch (err) {
        console.log('[runSingleBundleWatchCacheMergeTask] Merge error:',err);
    }
};


// 产物类型的源码，const runOutputSourceConfigMergeTask = async (list: any[]) => {，还需要合并 xxConfig.json 和 app.json 这部分配置文件代码
// 不论是单包打包产物还是 nanachi install 下载到的产物类型的包，都要走这个任务
const runOutputSourceConfigMergeTask = async (list: any[]) => {
    try {
        await mergeSourceFilesInOutput(list);
    } catch (err) {
        console.log('[runOutputSourceConfigMergeTask] Merge error:', err);
    }
};

// 将源码中的不参与编译的 json 配置文件拷贝到代码产物目录下
const runSourceConfigMoveTask = async () => {
    try {
        const copyList = ['app.json',`${config.buildType}Config.json`].map((el: string) => {
            // 先判断文件是否存在，存在则复制
            const filePossiblePath = path.join(utils.getProjectRootPath(), 'source', el);
            if (fs.existsSync(filePossiblePath)) {
                return {
                    from: filePossiblePath,
                    to: path.join(utils.getDistDir(), getMultiplePackDirPrefixNew(), el)
                };
            }
        });

        const allCopyTasks = copyList.map(({from, to}) => {
            // @ts-ignore
            console.log(`[runSourceConfigMoveTask] 准备复制的json配置文件: ${from} -> ${to}`);
            return fs.copyFile(from, to);
        });

        await Promise.all(allCopyTasks);
    } catch (err) {
        console.log('[runSourceConfigMoveTask] Move error:',err);
    }
};

// 将多个包的 sourcemap 文件夹合并到一个包中，合并的地址是唯一的
const runSourcemapMergeTask = async(list) => {

}

export {
    runChaikaMergeTask,
    runOutputCacheCodesMergeTask,
    runSingleBundleWatchCacheMergeTask,
    runOutputSourceConfigMergeTask,
    runSourceConfigMoveTask,
    runSourcemapMergeTask,
};
