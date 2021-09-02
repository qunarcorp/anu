import path from 'path';
import fs from 'fs-extra';
import shelljs from 'shelljs';
import utils from '../../packages/utils/index';
import install from '../../bin/commands/install';
import { getMultiplePackDirPrefix } from './isMutilePack';


async function installDefaultModule(buildType: string) {
   const defaultModuleConsts = require(path.join(utils.getProjectRootPath(), 'node_modules/@qnpm/chaika-patch/defaultModuleConsts'));
   const installModules = defaultModuleConsts.map(function(curModule:any) {
        return Object.assign({}, {
            name: curModule.name,
            installModulePath: path.join(
                utils.getProjectRootPath(), 
                '.CACHE/download', 
                getMultiplePackDirPrefix(), 
                curModule.name
            ),
            installVersion: curModule.versions[buildType]
        });
    });

    for(let i of installModules) {
       i.exists = await fs.pathExists(i.installModulePath)
    }

    installModules
    .filter(function(curModule:any) {
        return !curModule.exists;
    })
    .forEach(function(curModule:any) {
        install(
            `${curModule.name.replace(/^(nnc_module_)|(nnc_)/, '')}@#${curModule.installVersion}`,
            {}
        );
    })
   
    

}

export default installDefaultModule;