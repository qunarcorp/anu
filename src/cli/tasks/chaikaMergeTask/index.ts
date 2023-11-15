import copySource from './copySource';
import mergeSourceFiles from './mergeSourceFiles';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getMultiplePackDirPrefix } from './isMutilePack';
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

const runChaikaMergeTask = async () => {
    try {
        //copy 资源，只剩下需要特殊处理的合并文件在下一步处理
        await copySource();
        // 合并下载缓存区的文件
        await mergeSourceFiles();
        //创建软连接
        makeSymLink();
        changeWorkingDir();
    } catch (err) {
        // eslint-disable-next-line
        console.log('chaikaMerge error:',err);
    }
};


export {
    runChaikaMergeTask
};
