import * as path from 'path';

// 旧逻辑仅通过 buildType 查找
// 如果传入了 XConfigJson 对象，则直接使用
module.exports = function(buildType: string, XConfigJson: any) {
    let subPackages = [];
    try {
        let appRootConfig;
        if (XConfigJson) {
            appRootConfig = XConfigJson;
        } else {
            appRootConfig = require(path.join(process.cwd(), 'source', `${buildType}Config.json`));
        }
        /**
         * subPackages: [
         *      {
         *          "name": "native",
         *          "resource": "pages/demo/native"
         *      }
         * ],
         * subpackages: [
         *   {}
         * ]
         */
        subPackages = Object.keys(appRootConfig).reduce((startValue, el) => {
            if (el.toLowerCase() === 'subpackages' && appRootConfig[el].length ) {
                startValue = startValue.concat(appRootConfig[el]);
            }
            return startValue;
        }, []);
        // subPackages = appRootConfig.subpackages || appRootConfig.subPackages || [];
    } catch (err) {

    }
    return subPackages;
};
