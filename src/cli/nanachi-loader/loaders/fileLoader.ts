import { NanachiLoaderStruct } from './nanachiLoader';
import * as path from 'path';
import * as fs from 'fs-extra';
import config from '../../config/config';
const utils = require('../../packages/utils/index');
/**
 * queues 存放需要输出的文件
 * exportCode fileLoader的输出结果，提供给 webpack，用来解析下个依赖文件
 * 处理快应用的多个文件合并成一个文件，QQ小程序添加空的样式文件的各种情况
 */

module.exports = async function({ queues = [], exportCode = '' }: NanachiLoaderStruct, map: any, meta: any) {
    this._compiler.NANACHI = this._compiler.NANACHI || {};
    this._compiler.NANACHI.webviews = this._compiler.NANACHI.webviews || [];
    if ( utils.isWebView(this.resourcePath) ) {
        this._compiler.NANACHI.webviews.push({
            id: this.resourcePath
        });

        queues = [];
        exportCode = '';
    }

    const callback = this.async();
    queues.forEach(({ code = '', path: relativePath, fileMap}) => {
        //qq轻应用，页面必须有样式，否则页面无法渲染，这是qq轻应用bug
        if ( this.nanachiOptions.platform === 'qq' && /[\/\\](pages|components)[\/\\]/.test(this.resourcePath) && path.parse(this.resourcePath).base === 'index.js' ) {
            //to do .css 有问题
            if (!this._compilation.assets[relativePath]) {
                this.emitFile(path.join(path.dirname(relativePath), 'index.qss'), '', map);
            }
        }

        const sourceMapPath = path.join(utils.getDisSourceMapDir(), relativePath);

        // 与其他技术融合，可能得提前需要app.js, app.json
        const fileBaseName = path.basename(relativePath);
        if (this.nanachiOptions.platform === 'wx' && ['app.js', 'app.json', 'app.wxss'].includes(fileBaseName)) {
            const distPath = path.join(utils.getDistDir(), fileBaseName);
            fs.ensureFileSync(distPath);
            fs.writeFile(distPath, code, function(err) {
                if (err) {
                    throw err;
                }
            });


            if (config.sourcemap && fileMap){
                fs.ensureFileSync(sourceMapPath+'.map');
                fs.writeFile(sourceMapPath+'.map', JSON.stringify(fileMap), function(err) {
                    if (err) {
                        throw err;
                    }
                });
            }

            return;
        }

        if (config.sourcemap && fileMap){
            // 单包模式下会创建一个临时的 xxShadowApp.js，名字是固定的（属于关键字），此文件不需要生成 sourcemap
            if (sourceMapPath.includes(`${config.buildType}ShadowApp.js`)) {
                // do nothing
            } else {
                fs.ensureFileSync(sourceMapPath+'.map');
                fs.writeFile(sourceMapPath+'.map', JSON.stringify(fileMap), function(err) {
                    if (err) {
                        throw err;
                    }
                });
            }
        }

        // 同理，xxShadowApp.js 此文件不需要生成产物，目前暂时设定为这样吧
        if (relativePath.includes(`${config.buildType}ShadowApp.js`)) {
            // do nothing
        } else {
            this.emitFile(relativePath, code, map);
        }
    });

    callback(null, exportCode, map, meta);
};
