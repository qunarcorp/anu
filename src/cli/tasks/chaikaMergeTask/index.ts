import copySource from './copySource';
import mergeFiles from './mergeFiles';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getMultiplePackDirPrefix } from './isMutilePack';
const cwd = process.cwd();

// chaika 合并完毕后，进程工作目录要切换到 .CACHE/nanachi 下
function changeWorkingDir(){
    process.chdir(path.join(cwd, '.CACHE/nanachi',  getMultiplePackDirPrefix()));
}

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

export default async function(){
    try {
        //copy 资源
        await copySource();
        //合并各种配置，注入
        await mergeFiles();
        //创建软连接
        makeSymLink();
        changeWorkingDir();
    } catch (err) {
        // eslint-disable-next-line
        console.log('chaikaMerge error:',err);
    }
};