import path from 'path';
import fs from 'fs-extra';
import utils from '../../packages/utils/index';
import install from '../../bin/commands/install';
import { getMultiplePackDirPrefix } from './isMutilePack';


/**
 * 安装 chaika 模式最基本要求的 home 和 platform 包，安装分支由 chaika-patch 的 defaultModuleConsts 提供
 * @param buildType 构建类型
 */
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

    // 如果存在，就不再安装（相当于 nanachi install 已经针对特定 tag 拉了下来）
    for (let i of installModules) {
        i.exists = await fs.pathExists(i.installModulePath);
    }

    for (const curModule1 of installModules.filter(function (curModule: any) {
        return !curModule.exists;
    })) {
        await install(
            `${curModule1.name.replace(/^(nnc_module_)|(nnc_)/, '')}@#${curModule1.installVersion}`,
            {}
        );
    }
}

export default installDefaultModule;
