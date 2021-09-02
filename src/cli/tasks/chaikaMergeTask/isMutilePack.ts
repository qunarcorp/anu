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
    return isMultiple ? config.buildType : '';
};


