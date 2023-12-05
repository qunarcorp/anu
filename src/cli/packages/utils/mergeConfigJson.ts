import * as path from 'path';
const buildType = process.env.ANU_ENV;
const config = require('../../config/config');

const mergeConfigJsonWithModuleJudge = (modules: any, json: any) => {
    if (modules.componentType !== 'App') {
        return json;
    }

    return mergeConfigJson(json);
};

// 改造的方式同 setSubPackage
const mergeConfigJson = (json: any, XConfigJson ?: any) => {
    let configJson: any = {};
    let userConfig: any = {};
    try {
        if (XConfigJson) {
            userConfig = XConfigJson;
        } else {
            userConfig = require( path.join(process.cwd(), 'source', `${buildType}Config.json` ));
        }
    } catch (err) {}
    Object.assign(configJson, userConfig);

    if (buildType != 'quick') {
        delete configJson.subPackages;
        delete configJson.subpackages;
    }
    if (configJson.plugins) {
        Object.assign(configJson.plugins, config.plugins);
    }
    Object.assign(json, configJson);
    return json;
};

module.exports = {
    mergeConfigJsonWithModuleJudge,
    mergeConfigJson
};
