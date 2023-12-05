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
const utils_1 = __importDefault(require("../packages/utils"));
const config_1 = __importDefault(require("../config/config"));
const chaikaMergeTask_1 = require("../tasks/chaikaMergeTask");
const { exec } = require('child_process');
const path = require('path');
const id = 'SingleBundlePlugin';
class SingleBundlePlugin {
    constructor() {
        this.launchStatus = 'NONE';
    }
    apply(compiler) {
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            const projectList = Array.from(config_1.default.projectWatcherList);
            console.log('config.projectWatcherList', config_1.default.projectWatcherList);
            for (let i = 0; i < projectList.length; i++) {
                const projectPath = projectList[i];
                compilation.contextDependencies.add(path.join(projectPath, 'source'));
            }
            console.log('compilation.contextDependencies', compilation.contextDependencies);
        });
        compiler.hooks.done.tap(id, () => __awaiter(this, void 0, void 0, function* () {
            console.log('============= webpack done =============');
            if (utils_1.default.isSingleBundle() && utils_1.default.isWatchMode() && this.launchStatus === 'NONE') {
                try {
                    yield this.execInstallSync();
                    yield this.execBuildNoCurrentSync();
                }
                catch (err) {
                    process.exit(1);
                }
                this.launchStatus = 'SUCCESS';
            }
            if (!utils_1.default.isSingleBundle()) {
                chaikaMergeTask_1.runOutputCacheCodesMergeTask();
            }
            if (utils_1.default.isSingleBundle() && utils_1.default.isWatchMode()) {
                chaikaMergeTask_1.runSingleBundleWatchCacheMergeTask();
            }
        }));
    }
    execInstallSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi install -p ${config_1.default.buildType}`;
            const commandWithEnv = this.setEnvStringOnCommand(command);
            console.log(`nanachi 子进程即将执行：${commandWithEnv}`);
            exec(commandWithEnv, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[nanachi 子进程异常] ${error}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error(`[公共代码下载异常] ${stderr}`);
                    reject(stderr);
                    return;
                }
                console.log(`[公共代码下载中] ${stdout}`);
                resolve();
            });
        });
    }
    execBuildNoCurrentSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi build:${config_1.default.buildType} -nc`;
            const commandWithEnv = this.setEnvStringOnCommand(command);
            console.log(`nanachi 子进程即将执行：${commandWithEnv}`);
            exec(commandWithEnv, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[nanachi 子进程异常] ${error}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    console.error(`[基座打包执行异常] ${stderr}`);
                    reject(stderr);
                    return;
                }
                console.log(`[基座打包执行中] ${stdout}`);
                resolve();
            });
        });
    }
    setEnvStringOnCommand(originCMD) {
        const env = Object.assign({}, process.env);
        const envKeys = Object.keys(env);
        const envStr = envKeys.map((key) => `${key}=${env[key]}`).join(' ');
        return `${envStr} ${originCMD}`;
    }
}
exports.default = SingleBundlePlugin;
