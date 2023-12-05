import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import config from '../../config/config';

const chalk = require('chalk');

/**
 * 从单包产物路径拷贝代码到主包打包的产物路径
 * 这种方式进行主要进行拷贝（一对一目录，重名就覆盖），而不进行合并
 * 仅支持单一路径到另一单一路径的复制
 * @param {*} from 单包产物目录路径
 * @param {*} to 主包产物目录路径
 * @param {*} globList 可选项，可以传入 from 中需要处理的文件路径。如果不传，则默认为 from 目录下全部文件。拷贝部分文件时，通过传入 globList 进行拷贝速度优化（例如 watch）
 */
function copySingleBundleToFullBundle(from: string, to: string, globList: string[], ) {
    const files = globList || glob.sync(from + '/**', {nodir: true});

    const allPromiseCopy = files.map((file) => {
        const srcFile = path.join(file);
        const destFile = path.join(to, path.relative(from, file)); // 生成目标路径

        // 判断目标路径是否存在，如果存在输出个提示，但不解决冲突，让用户看到提示自行决定是否解决冲突
        // 实际这里不应该出现冲突，出现冲突意味着合并过程中出现了文件覆盖的情况
        // 注意：只有第一次编译的时候会提示，之后编译的时候大概率出现 destFile 存在的情况（比如我修改一个文件触发rebuild，一定会提示），所以除第一次编译以外不再提醒了
        if (fs.existsSync(destFile) && config.forFirstCompile) {
            console.log(chalk.yellow(`[copySingleBundleToFullBundle {初次编译提醒}] 目标路径 ${destFile} 已存在，拷贝时会产生覆盖，请自行检查是否需要处理`));
        }

        fs.ensureFileSync(destFile);
        return fs.copyFile(srcFile, destFile);
    });

    return Promise.all(allPromiseCopy || []);
}

export default function(from: string, to: string, globList: string[]) {
    return copySingleBundleToFullBundle(from, to, globList)
        .then(function () {
            // console.log('[copySingleBundleToFullBundle] 拷贝完成');
            return Promise.resolve(1);
        })
        .catch(function (err) {
            // console.log('[copySingleBundleToFullBundle] 拷贝失败');
            return Promise.reject(err);
        });
}
