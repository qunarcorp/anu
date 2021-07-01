/**
 * 返回当前编译文件打包后的绝对路径
 * 
 * @param {string} sourcePath 当前解析文件的绝对路径
 * @return {string} 当前解析文件打包后的路径, 如:
 *   node_modules/cookie/index.js => dist/npm/cookie/index.js
 *   source/components/Cat/index.js => dist/components/Cat/index.js
 *   source/common/login.js => dist/common/login.js
 */
import utils from './index';
import path from 'path';

import config from '../../config/config';

 function fixWinPath(p: string) {
     return p.replace(/\\/g, '/');
 }
 function getDistPath(sourcePath: string) {
     sourcePath = fixWinPath(sourcePath);
     let nodeModuleReg = /\/node_modules\//;
     let distPath = '';
 
     // 如果是node_modules模块, 目录要替换成dist/npm, 否则换成 dist

     if (nodeModuleReg.test(sourcePath)) {
        distPath = path.join(
            utils.getProjectRootPath(), 
            `${config.buildDir}`, 
            'npm',
            sourcePath.split('/node_modules/').pop()
        )
     } else {
         // /nnc_module_qunar_platform/.CACHE/nanachi/wx/source/npm/@qnpm/nui/source/components/Button/index.js
         // /nnc_module_qunar_platform/.CACHE/nanachi/wx/source/pages/xxx.js
         // /nnc_module_qunar_platform/.CACHE/nanachi/wx/source/npm/xxx.js
         // /xxx/source/pages/yyyy


         if (/\/npm\//.test(sourcePath)) {
            distPath = path.join(
                utils.getProjectRootPath(),
                `${config.buildDir}/npm`,
                sourcePath.split('/npm/').pop()
            )
         } else if (/\/source\//.test(sourcePath)) {
            distPath = path.join(
                utils.getProjectRootPath(),
                `${config.buildDir}`,
                sourcePath.split('/source/').pop()
            )
         } else {
             
             // xxx/app.js
             distPath = path.join(
                utils.getProjectRootPath(),
                `${config.buildDir}`
             )
         }
     }
    
     
     //快应用目录要替换成src
     distPath = process.env.ANU_ENV === 'quick' 
         ? distPath.replace(
             new RegExp('/' + config.buildDir + '/'),
             '/src/'
            )
         : distPath;
 
     return distPath;
 };
 
 module.exports = getDistPath;
 export default getDistPath;