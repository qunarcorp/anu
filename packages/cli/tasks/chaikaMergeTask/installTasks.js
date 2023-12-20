"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mergeUtils_1 = require("./mergeUtils");
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const shelljs = require('shelljs');
const ANU_ENV = mergeUtils_1.get_ANU_ENV();
const cwd = process.cwd();
const ignoreExt = ['.tgz'];
function getNodeModulesList(config) {
    let mergeData = mergeUtils_1.getMergedData(config);
    return Object.keys(mergeData).reduce(function (ret, key) {
        ret.push(key + '@' + mergeData[key]);
        return ret;
    }, []);
}
function execSyncInstallTasks(map) {
    console.log('map.pkgDependencies:', map.pkgDependencies);
    console.log('map.pkgDevDep:', map.pkgDevDep);
    let installList = [...getNodeModulesList(map.pkgDependencies), ...getNodeModulesList(map.pkgDevDep)];
    installList = Array.from(new Set(installList));
    console.log('installList:', installList.join('\n'));
    if (ANU_ENV !== 'quick') {
        installList = installList.filter((dep) => {
            return !/hap\-toolkit/.test(dep);
        });
    }
    else {
        const hapToolKitVersion = process.env.hapToolKitVersion;
        installList = installList.map((dep) => {
            if (/hap\-toolkit/.test(dep) && hapToolKitVersion) {
                dep = `hap-toolkit@${hapToolKitVersion}`;
            }
            return dep;
        });
    }
    if (process.env.JENKINS_URL && map.ignoreInstallPkg.length) {
        const ignoreInstallReg = new RegExp(map.ignoreInstallPkg.join('|'));
        installList = installList.filter(function (el) {
            return !ignoreInstallReg.test(el);
        });
    }
    let installPkgList = installList.reduce(function (needInstall, pkg) {
        const pkgMeta = pkg.split('@');
        const pkgName = pkgMeta[0] === '' ? '@' + pkgMeta[1] : pkgMeta[0];
        const p = path.join(cwd, 'node_modules', pkgName, 'package.json');
        const isExit = fs.existsSync(p);
        if (!isExit) {
            needInstall.push(pkg);
        }
        return needInstall;
    }, []);
    installPkgList = installPkgList.filter(function (dep) {
        return !ignoreExt.includes('.' + dep.split('.').pop());
    });
    if (installPkgList.length) {
        let installList = installPkgList.join(' ');
        let installListLog = installPkgList.join('\n');
        fs.ensureDir(path.join(cwd, 'node_modules'));
        const npmRegistry = process.env.npmRegistry;
        let cmd = '';
        let installMsg = '';
        if (npmRegistry) {
            cmd = `npm install ${installList} --no-save --registry=${npmRegistry}`;
            installMsg = `🚚 正在从 ${npmRegistry} 安装拆库依赖, 请稍候...\n${installListLog}`;
        }
        else {
            cmd = `npm install --prefer-offline ${installList} --no-save`;
            installMsg = `🚚 正在安装拆库依赖, 请稍候...\n${installListLog}`;
        }
        console.log(chalk.bold.green(installMsg));
        let std = shelljs.exec(cmd, {
            silent: false
        });
        if (/npm ERR/.test(std.stderr)) {
            console.log(chalk.red(std.stderr));
            process.exit(1);
        }
    }
}
exports.execSyncInstallTasks = execSyncInstallTasks;
