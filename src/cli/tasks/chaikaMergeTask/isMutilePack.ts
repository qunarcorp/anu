/*
 * @Author: tianbao.wu tianbao.wu@qunar.com
 * @Date: 2023-11-14 10:39:01
 * @LastEditors: tianbao.wu tianbao.wu@qunar.com
 * @LastEditTime: 2023-11-15 17:31:54
 * @FilePath: /anu/src/cli/tasks/chaikaMergeTask/isMutilePack.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import path from 'path';
import utils from '../../packages/utils/index';
import config from '../../config/config';
const projectRootPath = utils.getProjectRootPath();

const isMultiple = function() {
    const pkgJson = require(path.join(projectRootPath, 'package.json'));
    const isMultiple = (pkgJson.nanachi || {}).multiple || false;
    return isMultiple;
}

export default isMultiple;
export const getMultiplePackDirPrefix = function() {
    // 永远返回平台数据
    return isMultiple ? config.buildType : '';
};
// 需要判断平台则用此方法
export const getMultiplePackDirPrefixNew = function(){
    return isMultiple() ? config.buildType : '';
};

