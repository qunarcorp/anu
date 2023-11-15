import {
    get_ANU_ENV,
    get_BUILD_ENV,
    get_buildType
} from './mergeUtils';

import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const cwd = process.cwd();
const buildType = get_buildType();
const ANU_ENV = get_ANU_ENV();
const BUILD_ENV = get_BUILD_ENV();


/**
 * 从单包产物路径拷贝代码到主包打包的产物路径
 * 这种方式进行主要进行拷贝（一对一目录），而不进行合并
 * @param {*} from 单包产物路径
 * @param {*} to 主包产物路径
 * @param {*} globList 可选项，可以传入 from 中需要处理的文件路径。如果不传，则默认为 from 目录下全部文件。拷贝部分文件时，通过传入 globList 进行拷贝速度优化
 */
function copySingleBundleToFullBundle(from: string, to: string, globList: string[], ) {
    const files = globList || glob.sync(from + '/**', {nodir: true});

    const allPromiseCopy = files.map((file) => {
        const srcFile = path.join(file);
        const distFile = path.join(to, path.relative(from, file)); // 生成目标路径

        fs.ensureFileSync(distFile);
        return fs.copyFile(srcFile, distFile);
    });

    return Promise.all(allPromiseCopy || []);
}

export default function(from: string, to: string, globList: string[]) {
    return copySingleBundleToFullBundle(from, to, globList)
        .then(function () {
            return Promise.resolve(1);
        })
        .catch(function (err) {
            return Promise.reject(err);
        });
}
