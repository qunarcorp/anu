import { get_ANU_ENV, getMergedData } from './mergeUtils';

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const shelljs = require('shelljs');

const ANU_ENV = get_ANU_ENV();
const cwd = process.cwd();
const ignoreExt = ['.tgz'];

function getNodeModulesList(config: any) {
    let mergeData = getMergedData(config);
    return Object.keys(mergeData).reduce(function (ret, key) {
        ret.push(key + '@' + mergeData[key]);
        return ret;
    }, []);
}


export function execSyncInstallTasks (map: any) {
    //['cookie@^0.3.1', 'regenerator-runtime@0.12.1']
    // installList 是全部需要安装的依赖列表
    let installList = [...getNodeModulesList(map.pkgDependencies), ...getNodeModulesList(map.pkgDevDep)];
    installList = Array.from(new Set(installList));

    if (ANU_ENV !== 'quick') {
        installList = installList.filter((dep) => {
            return !/hap\-toolkit/.test(dep);
        });
    } else {
        const hapToolKitVersion = process.env.hapToolKitVersion;
        installList = installList.map((dep) => {
            if (/hap\-toolkit/.test(dep) && hapToolKitVersion) {
                dep = `hap-toolkit@${hapToolKitVersion}`;
            }
            return dep;
        });
    }

    // 集成环境上过滤这些没用的包安装
    if (process.env.JENKINS_URL && map.ignoreInstallPkg.length) {
        const ignoreInstallReg = new RegExp(map.ignoreInstallPkg.join('|'));
        installList = installList.filter(function (el) {
            return !ignoreInstallReg.test(el);
        });
    }

    let installPkgList = installList.reduce(function (needInstall, pkg) {
        //@xxx/yyy@1.0.0 => xxx
        const pkgMeta = pkg.split('@');
        const pkgName = pkgMeta[0] === '' ? '@' + pkgMeta[1] : pkgMeta[0];

        // 查找这个包是否在 node_modules 下存在 pkg 文件，不存在则认为没有安装，加入 installPkgList
        // eslint-disable-next-line no-undef
        const p = path.join(cwd, 'node_modules', pkgName, 'package.json');
        const isExit = fs.existsSync(p);
        if (!isExit) {
            needInstall.push(pkg);
        } else {
            console.log(`[execSyncInstallTasks] 依赖 ${pkg} 在目录 ${p} 下已存在，跳过安装`);
        }
        return needInstall;
    }, []);

    // 取后缀，过滤非法依赖
    installPkgList = installPkgList.filter(function (dep: string) {
        return !ignoreExt.includes('.' + dep.split('.').pop());
    });

    // 本地 node_modules 的依赖有两个来源：1.当前工作区的工程需要的依赖  2. 下载缓存区的其他工程所需依赖
    // 安装来源为 installPkgList
    if (installPkgList.length) {
        //installPkgList = installPkgList.slice(0,2);

        let installList = installPkgList.join(' ');

        // --no-save 是为了不污染用户的package.json
        // eslint-disable-next-line
        let installListLog = installPkgList.join('\n');

        fs.ensureDir(path.join(cwd, 'node_modules'));
        const npmRegistry = process.env.npmRegistry;

        let cmd = '';
        let installMsg = '';
        if (npmRegistry) {
            cmd = `npm install ${installList} --no-save --registry=${npmRegistry}`;
            installMsg = `🚚 正在从 ${npmRegistry} 安装拆库依赖, 请稍候...\n${installListLog}`;
        } else {
            cmd = `npm install --prefer-offline ${installList} --no-save`;
            installMsg = `🚚 正在安装拆库依赖, 请稍候...\n${installListLog}`;
        }

        console.log(chalk.bold.green(installMsg));

        // eslint-disable-next-line
        let std = shelljs.exec(cmd, {
            silent: false
        });


        if (/npm ERR/.test(std.stderr)) {
            // eslint-disable-next-line
            console.log(chalk.red(std.stderr));
            process.exit(1);
        }
    }
}

