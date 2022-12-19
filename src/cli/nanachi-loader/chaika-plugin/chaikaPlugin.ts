import webpack = require("webpack");
import utils from '../../packages/utils';
import { getMultiplePackDirPrefix } from '../../tasks/chaikaMergeTask/isMutilePack';
const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');

class ChaikaPlugin {
    apply(compiler: webpack.Compiler){
       
        //thanks https://github.com/webpack/webpack-dev-server/issues/34#issuecomment-47420992
        
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            compilation.contextDependencies.add(
                path.join(utils.getProjectRootPath(), 'source')
            );
        });

       
        // https://github.com/hashicorp/prebuild-webpack-plugin/blob/master/index.js#L57
        compiler.hooks.watchRun.tap(id, () => {
            const { watchFileSystem } = compiler as any;          
            const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher
            const changedFile = Object.keys(watcher.mtimes || compiler.modifiedFiles || {})
            const sourceReg = /\/source\//;
            changedFile.forEach((file) => {
                const patchedFile = file.replace(/\\/g, '/');
                if (
                    sourceReg.test(patchedFile)
                    && !/\/\.CACHE\//.test(patchedFile)
                ) {
                    fs.copy(
                        file,
                        file.replace(
                            sourceReg, 
                            `/.CACHE/nanachi/${getMultiplePackDirPrefix()}/source/`.replace(/\/\//g, '/')
                        ),
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