"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __importDefault(require("../../packages/utils"));
const config_1 = __importDefault(require("../../config/config"));
const chaikaMergeTask_1 = require("../../tasks/chaikaMergeTask");
const isMutilePack_1 = require("../../tasks/chaikaMergeTask/isMutilePack");
const { exec } = require('child_process');
const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');
const chalk = require('chalk');
function getListFromSingleBundleDist() {
    return utils_1.default.isSingleBundle() ? [path.join(utils_1.default.getDistDir(), isMutilePack_1.getMultiplePackDirPrefixNew())] : [];
}
function getListFromDownloadCache() {
    const { projectSourceTypeList } = config_1.default;
    return projectSourceTypeList.filter((item) => item.sourceType === 'output').map(item => item.path) || [];
}
class ChaikaPlugin {
    constructor() {
        this.envStringWhiteList = [
            'SKIP', 'NODE_ENV', 'JENKINS_URL', 'appid'
        ];
    }
    apply(compiler) {
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            const projectList = Array.from(config_1.default.projectWatcherList);
            for (let i = 0; i < projectList.length; i++) {
                const projectPath = projectList[i];
                compilation.contextDependencies.add(path.join(projectPath, 'source'));
            }
        });
        compiler.hooks.watchRun.tap(id, () => {
            if (!utils_1.default.isSingleBundle()) {
                const { watchFileSystem } = compiler;
                const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;
                const changedFile = Object.keys(watcher.mtimes);
                const sourceReg = /\/source\//;
                changedFile.forEach((file) => {
                    const patchedFile = file.replace(/\\/g, '/');
                    if (sourceReg.test(patchedFile)
                        && !/\/\.CACHE\//.test(patchedFile)) {
                        const patchArr = patchedFile.split('source');
                        const targetFilePath = path.join(process.cwd(), 'source', patchArr[1]);
                        try {
                            fs.copySync(file, targetFilePath);
                        }
                        catch (err) {
                            console.log('watchrun copyErr!');
                            console.log(err);
                        }
                    }
                });
            }
        });
        compiler.hooks.done.tap(id, () => __awaiter(this, void 0, void 0, function* () {
            const isWatch = utils_1.default.isWatchMode();
            const isSingleBundle = utils_1.default.isSingleBundle();
            if (isSingleBundle && isWatch && config_1.default.childProcessLaunchStatus === 'NONE') {
                try {
                    yield this.execInstallSync();
                    yield this.execBuildNoCurrentSync();
                }
                catch (err) {
                    console.log('chaikaPlugin exec err!');
                    console.error(err);
                    process.exit(1);
                }
                config_1.default.childProcessLaunchStatus = 'SUCCESS';
            }
            if (isSingleBundle) {
                console.log(chalk.yellow('单包打包产物配置文件拷贝中，拷贝成功前请不要移动产物目录下的文件'));
                yield chaikaMergeTask_1.runSourceConfigMoveTask();
                console.log(chalk.green('拷贝成功'));
            }
            const mergeProjectDirList = !utils_1.default.isSingleBundle() ? getListFromDownloadCache() : getListFromSingleBundleDist();
            if (!isSingleBundle) {
                console.log(chalk.yellow('下载缓存区产物代码合并中，合并成功前请不要移动产物目录下的文件'));
                yield chaikaMergeTask_1.runOutputCacheCodesMergeTask();
                yield chaikaMergeTask_1.runOutputSourceConfigMergeTask(mergeProjectDirList);
                console.log(chalk.green('合并成功'));
            }
            if (isSingleBundle && isWatch) {
                console.log(chalk.yellow('单包打包产物合并中，合并成功前请不要移动产物目录下的文件'));
                yield chaikaMergeTask_1.runSingleBundleWatchCacheMergeTask();
                yield chaikaMergeTask_1.runOutputSourceConfigMergeTask(mergeProjectDirList);
                console.log(chalk.green('合并成功'));
            }
            if (config_1.default.forFirstCompile) {
                console.log(chalk.yellow(`执行配置文件中 import 语句插入`));
                this.addImportSyntaxToAppJs(mergeProjectDirList);
                console.log(chalk.green(`插入成功`));
                config_1.default.forFirstCompile = false;
            }
            if (isWatch) {
                console.log('监听开始，等待使用者修改代码重新进行编译...');
            }
        }));
    }
    execInstallSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi install -p ${config_1.default.buildType}`;
            const commandWithEnv = this.setEnvStringOnCommand(command);
            console.log(`nanachi 子进程即将执行：${commandWithEnv}`);
            console.log(chalk.bgMagenta(`${commandWithEnv} 执行中......`));
            exec(commandWithEnv, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[nanachi 子进程异常] ${error}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error(chalk.bgMagenta(`[公共代码下载异常] ${stderr}`));
                }
                console.log(chalk.bgMagenta(`[公共代码下载中] ${stdout}`));
                resolve();
            });
        });
    }
    execBuildNoCurrentSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi build:${config_1.default.buildType} --noCurrent`;
            const commandWithEnv = this.setEnvStringOnCommand(command);
            console.log(`nanachi 子进程即将执行：${commandWithEnv}`);
            console.log(chalk.bgCyan(`${commandWithEnv} 执行中......`));
            exec(commandWithEnv, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[nanachi 子进程异常] ${error}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error(chalk.bgCyan(`[基座打包执行异常] ${stderr}`));
                }
                console.log(chalk.bgCyan(`[基座打包执行中] ${stdout}`));
                resolve();
            });
        });
    }
    setEnvStringOnCommand(originCMD) {
        const env = Object.assign({}, process.env);
        Object.keys(env).forEach((key) => {
            if (!this.envStringWhiteList.includes(key)) {
                delete env[key];
            }
        });
        const envKeys = Object.keys(env);
        const envStr = envKeys.map((key) => `${key}=${env[key]}`).join(' ');
        return `${envStr} ${originCMD}`;
    }
    deleteUnnecessaryXConfigInDist() {
        const name = `${config_1.default.buildType}Config.json`;
        const xConfigPath = path.join(utils_1.default.getDistDir(), isMutilePack_1.getMultiplePackDirPrefixNew(), name);
        if (fs.existsSync(xConfigPath)) {
            console.log(chalk.green(`移除产物目录下多余的 ${name} 文件，移除成功前请不要移动任何文件`));
            fs.removeSync(xConfigPath);
            console.log(chalk.green(`移除成功`));
        }
    }
    addImportSyntaxToAppJs(waitedMergeProjectDirList) {
        const appJsPath = path.join(utils_1.default.getFixedDistDir(false), isMutilePack_1.getMultiplePackDirPrefixNew(), 'app.js');
        const importSyntax = waitedMergeProjectDirList.map((dir) => {
            const bundleAppJsonPath = path.join(dir, `app.json`);
            if (fs.existsSync(bundleAppJsonPath)) {
                let bundleAppJson;
                try {
                    bundleAppJson = require(bundleAppJsonPath);
                }
                catch (e) {
                    console.error(`[addImportSyntaxToAppJs] 添加路径为 ${bundleAppJsonPath} 文件时失败 `);
                }
                if (bundleAppJson.imports && bundleAppJson.imports.length) {
                    const text = bundleAppJson.imports.join('\n');
                    console.log(`[addImportSyntaxToAppJs] 准备插入 ${text}`);
                    return text;
                }
            }
            return '';
        }).join('\n');
        if (fs.existsSync(appJsPath)) {
            const appJsContent = fs.readFileSync(appJsPath, 'utf-8');
            const importReactIndex = appJsContent.indexOf('import React from');
            if (importReactIndex === -1) {
                console.error(`[addImportSyntaxToAppJs] 未查找到 app.js 下存在引入 react 的代码，请联系 nanachi 开发者`);
                process.exit(1);
            }
            const newAppJsContent = appJsContent.slice(0, importReactIndex) + importSyntax + '\n' + appJsContent.slice(importReactIndex);
            fs.writeFileSync(appJsPath, newAppJsContent);
        }
        else {
            console.log(`[addImportSyntaxToAppJs] 没找到 ${appJsPath} 文件，跳过插入流程`);
        }
    }
}
exports.default = ChaikaPlugin;
