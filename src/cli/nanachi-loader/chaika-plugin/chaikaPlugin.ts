import webpack from 'webpack';
import utils from '../../packages/utils';
import config, {projectSourceType} from '../../config/config';
import {
    runOutputCacheCodesMergeTask,
    runSingleBundleWatchCacheMergeTask,
    runOutputSourceConfigMergeTask,
    runSourceConfigMoveTask,
    runSourcemapMergeTask,
} from "../../tasks/chaikaMergeTask";
import {getMultiplePackDirPrefixNew} from "../../tasks/chaikaMergeTask/isMutilePack";

const {exec} = require('child_process');
const path = require('path');
const id = 'ChaikaPlugin';
const fs = require('fs-extra');
const chalk = require('chalk');

function getListFromSingleBundleDist() {
    return utils.isSingleBundle() ? [ path.join(utils.getDistDir(), getMultiplePackDirPrefixNew()) ] : [];
}

function getListFromDownloadCache() {
    const { projectSourceTypeList} = config;
    return projectSourceTypeList.filter((item) => item.sourceType === 'output').map(item=>item.path) || [];
}

function getSourcemapListFromDownloadCache() {
    const { projectSourceTypeList} = config;
    return projectSourceTypeList.filter((item) => item.sourceType === 'output').map(item=>item.sourcemap) || [];
}


// 此插件主要用于处理涉及到多工程开发以及单工程开发时，需要处理的依赖，拷贝，子进程流程控制等功能
class ChaikaPlugin {
    private envStringWhiteList: Array<string> = [
        'SKIP', 'NODE_ENV', 'JENKINS_URL', 'appid'
    ];

    apply(compiler: webpack.Compiler){
        // thanks https://github.com/webpack/webpack-dev-server/issues/34#issuecomment-47420992
        // 监听当前项目source目录：因为是未引入的文件，需要特殊处理
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            const projectList = Array.from(config.projectWatcherList);

            for (let i = 0; i < projectList.length; i++) {
                const projectPath = projectList[i];
                compilation.contextDependencies.add(
                    path.join(projectPath, 'source')
                );
            }
        });

        // https://github.com/hashicorp/prebuild-webpack-plugin/blob/master/index.js#L57
        // 未来升级 webpack 的话，参照这里修改 https://stackoverflow.com/questions/68063418/there-is-no-mtimes-attribute-on-webpack5-compiler-watchfilesystem-watcher-how-c
        // 监听source变化时，拷贝 /xx/source 到 .CACHE/nanachi/xx/ 下
        compiler.hooks.watchRun.tap(id, () => {
            // 仅在非单包模式下监听，需要处理文件拷贝
            if(!utils.isSingleBundle()) {
                const { watchFileSystem } = compiler as any;
                const watcher = watchFileSystem.watcher || watchFileSystem.wfs.watcher;
                const changedFile = Object.keys(watcher.mtimes);
                const sourceReg = /\/source\//;

                changedFile.forEach((file) => {
                    const patchedFile = file.replace(/\\/g, '/');
                    // 路径包含 source，且不包含.CACHE 的文件，由于 changedFile 可能包含 /.CACHE/nanachi 下的文件，所以需要过滤
                    if (
                        sourceReg.test(patchedFile)
                        && !/\/\.CACHE\//.test(patchedFile)
                    ) {
                        const patchArr = patchedFile.split('source');
                        const targetFilePath = path.join(process.cwd(), 'source', patchArr[1]);

                        // 工作区下的 source 不是打包监听目录，所以吧代码转到打包监听目录下的 source
                        try {
                            fs.copySync(
                                file,
                                targetFilePath,
                            );
                        } catch(err) {
                            console.log('watchrun copyErr!')
                            console.log(err);
                        }
                    }
                })
            }
        });

        // 不论 watch 还是 build，打包完成后都会触发
        compiler.hooks.done.tap(id, async () => {
            const isWatch = utils.isWatchMode();
            const isSingleBundle = utils.isSingleBundle();

            // 仅在单包模式下监听完成后，启动一次子进程进行基座代码打包
            // 也需要判断是否成功启动过，启动过就跳过启动的逻辑，直接复制
            if (isSingleBundle && isWatch && config.childProcessLaunchStatus === 'NONE') {
                try {
                    await this.execInstallSync();
                    await this.execBuildNoCurrentSync();
                } catch(err) {
                    console.log('chaikaPlugin exec err!');
                    console.error(err);
                    process.exit(1)
                }
                config.childProcessLaunchStatus = 'SUCCESS';
            }

            // 仅在单包模式下的 build 和 watch，将子包json配置文件直接拷贝到子包的产物目录下
            if (isSingleBundle) {
                console.log(chalk.yellow('[单包打包产物配置文件] 拷贝中，拷贝成功前请不要移动产物目录下的文件'));
                await runSourceConfigMoveTask();
                console.log(chalk.green('[单包打包产物配置文件] 拷贝成功'));
            }

            const mergeProjectDirList = !utils.isSingleBundle() ? getListFromDownloadCache() : getListFromSingleBundleDist();

            // 执行业务代码以及配置文件复制逻辑，执行的场景为：
            // 1. 多包模式下，build 后对下载缓存区中的打包产物（output 类型）进行合并
            // 2. 多包模式下，watch 后对下载缓存区中的打包产物（output 类型）进行合并
            // 3. 单包模式下，watch 后对工作区的打包产物进行合并（distc -> dist）（此处是在子进程打包合并完之后处理的）
            // 注意判断条件是互斥的
            if (!isSingleBundle) { // 1、2
                console.log(chalk.yellow('[下载缓存区产物代码] 合并中，合并成功前请不要移动产物目录下的文件'));
                await runOutputCacheCodesMergeTask(); // 合并 js
                await runOutputSourceConfigMergeTask(mergeProjectDirList); // 合并 json
                await runSourcemapMergeTask(getSourcemapListFromDownloadCache()); // 合并 sourcemap
                console.log(chalk.green('[下载缓存区产物代码] 合并成功'));
            }
            if (isSingleBundle && isWatch) { // 3
                console.log(chalk.yellow('[单包打包产物] 合并中，合并成功前请不要移动产物目录下的文件'));
                await runSingleBundleWatchCacheMergeTask(); // 合并 js
                await runOutputSourceConfigMergeTask(mergeProjectDirList); // 合并 json
                console.log(chalk.green('[单包打包产物] 合并成功'));
            }
            if (config.forFirstCompile) { // 记录一下是否是第一次进入 done 这个钩子
                // // 如果是第一次执行，则做一次 importSyntax 到 app.js 的插入
                // console.log(chalk.yellow(`执行配置文件中 import 语句插入`));
                // this.addImportSyntaxToAppJs(mergeProjectDirList);
                // console.log(chalk.green(`插入成功`));

                config.forFirstCompile = false;
            }
            if (isWatch) {
                console.log('监听开始，等待使用者修改代码重新进行编译...');
            }
        });
    }

    // 子进程执行安装
    execInstallSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi install -p ${config.buildType}`;
            const commandWithEnv = this.setEnvStringOnCommand(command);
            console.log(`nanachi 子进程即将执行：${commandWithEnv}`);

            console.log(chalk.bgMagenta(`${commandWithEnv} 执行中......`)); // 由于执行中的输出不是实时反馈在控制台中，所以只能多加一句输出
            exec(commandWithEnv, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[nanachi 子进程异常] ${error}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    // 此处的异常不一定影响主进程命令执行，不要强制 reject
                    console.error(chalk.bgMagenta(`[公共代码下载异常] ${stderr}`));
                }
                console.log(chalk.bgMagenta(`[公共代码下载中] ${stdout}`));
                resolve();
            });
        });
    }

    // 子进程执行打包，不需要监听，也不需要包含工作区的代码
    execBuildNoCurrentSync() {
        return new Promise((resolve, reject) => {
            const command = `nanachi build:${config.buildType} --noCurrent`;
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
                    // 此处的异常不一定影响主进程命令执行，不要强制 reject
                    console.error(chalk.bgCyan(`[基座打包执行异常] ${stderr}`));
                }
                console.log(chalk.bgCyan(`[基座打包执行中] ${stdout}`));
                resolve();
            });
        });
    }

    // 拼接主进程环境变量参数到子进程即将执行的命令中
    setEnvStringOnCommand(originCMD: string) {
        const env = Object.assign({}, process.env);
        // 通过 envStringWhiteList 过滤一下，原因是 process.env 里的内容实在是太多了
        // 而且有些参数并不应该继承到子进程（例如 NANACHI_CHAIK_MODE，这种都是运行中塞到环境变量里的，或者是 BUILD_ENV 这种属于是通过命令就能确定的环境变量），而是应该通过启动后的代码逻辑自行去判断或者添加
        Object.keys(env).forEach((key) => {
            if (!this.envStringWhiteList.includes(key)) {
                delete env[key];
            }
        });
        const envKeys = Object.keys(env);
        const envStr = envKeys.map((key) => `${key}=${env[key]}`).join(' ');
        return `${envStr} ${originCMD}`;
    }

    // 删除因为合并而产生在产物目录下多余的 xConfig.json
    deleteUnnecessaryXConfigInDist() {
        const name = `${config.buildType}Config.json`;
        const xConfigPath = path.join(utils.getDistDir(), getMultiplePackDirPrefixNew(), name);
        if (fs.existsSync(xConfigPath)) {
            console.log(chalk.green(`移除产物目录下多余的 ${name} 文件，移除成功前请不要移动任何文件`));
            fs.removeSync(xConfigPath);
            console.log(chalk.green(`移除成功`));
        }
    }

    // 重新执行将子包的 xConfig.json 中的 import 语句插入到最终的 app.js 中
    // 整包打包时，该逻辑是在 chaika merge 中进行的，由于插入位置已经无法保证和原流程完全一致，所以我们直接插入在 React 引入之前，反正所有的平台都必须引入该文件
    addImportSyntaxToAppJs(waitedMergeProjectDirList: any) {
        const appJsPath = path.join(utils.getFixedDistDir(false), getMultiplePackDirPrefixNew(), 'app.js');

        const importSyntax = waitedMergeProjectDirList.map((dir: string) => {
            const bundleAppJsonPath = path.join(dir, `app.json`);
            if (fs.existsSync(bundleAppJsonPath)) {
                let bundleAppJson;
                try {
                    bundleAppJson = require(bundleAppJsonPath);
                } catch(e) {
                    console.error(`[addImportSyntaxToAppJs] 添加路径为 ${bundleAppJsonPath} 文件时失败 `)
                }
                if (bundleAppJson.imports && bundleAppJson.imports.length) {
                    const text = bundleAppJson.imports.join('\n');
                    console.log(`[addImportSyntaxToAppJs] 准备插入 ${text}`)
                    return text;
                }
            }
            return '';
        }).join('\n');

        if (fs.existsSync(appJsPath)) {
            const appJsContent = fs.readFileSync(appJsPath, 'utf-8');

            // 在 app.js 中查找引入 react 的语句（一般不存在没引入的可能）插入到这前边
            const importReactIndex = appJsContent.indexOf('import React from');
            if (importReactIndex === -1) {
                console.error(`[addImportSyntaxToAppJs] 未查找到 app.js 下存在引入 react 的代码，请联系 nanachi 开发者`);
                process.exit(1);
            }

            const newAppJsContent = appJsContent.slice(0, importReactIndex) + importSyntax + '\n' + appJsContent.slice(importReactIndex);
            fs.writeFileSync(appJsPath, newAppJsContent);
        } else {
            console.log(`[addImportSyntaxToAppJs] 没找到 ${appJsPath} 文件，跳过插入流程`)
        }
    }


}

export default ChaikaPlugin;
