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
const buildType = process.env.ANU_ENV;
const config = require('../../config/config');
const mergeConfigJsonWithModuleJudge = (modules, json) => {
    if (modules.componentType !== 'App') {
        return json;
    }
    return mergeConfigJson(json);
};
const mergeConfigJson = (json, XConfigJson) => {
    let configJson = {};
    let userConfig = {};
    try {
        if (XConfigJson) {
            userConfig = XConfigJson;
        }
        else {
            userConfig = require(path.join(process.cwd(), 'source', `${buildType}Config.json`));
        }
    }
    catch (err) { }
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
