"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
module.exports = function (buildType, XConfigJson) {
    let subPackages = [];
    try {
        let appRootConfig;
        if (XConfigJson) {
            appRootConfig = XConfigJson;
        }
        else {
            appRootConfig = require(path.join(process.cwd(), 'source', `${buildType}Config.json`));
        }
        subPackages = Object.keys(appRootConfig).reduce((startValue, el) => {
            if (el.toLowerCase() === 'subpackages' && appRootConfig[el].length) {
                startValue = startValue.concat(appRootConfig[el]);
            }
            return startValue;
        }, []);
    }
    catch (err) {
    }
    return subPackages;
};
