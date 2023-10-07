import webpack = require("webpack");
import utils from '../../packages/utils';
import { getMultiplePackDirPrefix } from '../../tasks/chaikaMergeTask/isMutilePack';
import config from '../../config/config';

const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');

class ChaikaPlugin {
    apply(compiler: webpack.Compiler){
       
        //thanks https://github.com/webpack/webpack-dev-server/issues/34#issuecomment-47420992
        // 监听当前项目source目录：因为是未引入的文件，需要特殊处理
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            let projectList = [utils.getProjectRootPath()];
            if (config.multiProject.length > 1) {
                projectList = projectList.concat(config.multiProject);
            }

            for (let i = 0; i < projectList.length; i++) {
                const projectPath = projectList[i];
                compilation.contextDependencies.add(
                    path.join(projectPath, 'source')
                );
            }
        });

       
        // https://github.com/hashicorp/prebuild-webpack-plugin/blob/master/index.js#L57
        // 监听source变化时，拷贝到.CACHE/nanachi/xx/下
        compiler.hooks.watchRun.tap(id, () => {
            const { watchFileSystem } = compiler as any;
            const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher
            const changedFile = Object.keys(watcher.mtimes)
            const sourceReg = /\/source\//;
            changedFile.forEach((file) => {
                const patchedFile = file.replace(/\\/g, '/');
                if (
                    sourceReg.test(patchedFile)
                    && !/\/\.CACHE\//.test(patchedFile)
                ) {
                    const patchArr = patchedFile.split('source');
                    const targetFilePath = path.join(process.cwd(), 'source', patchArr[1]);

                    fs.copy(
                        file,
                        targetFilePath,
                        (err: Error)=>{
                            if (err) {
                                console.log(err);
                            }
                        }
                    );
                }
            })
        });

        
    }
}

export default ChaikaPlugin;