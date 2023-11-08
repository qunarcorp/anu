/**
 * 获取所有的alias配置，包括用户自定义的。
 */
import * as path from 'path';
const cwd = process.cwd();
const fs = require('fs');
let userConfig = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'))).nanachi || {};
let userRemoteNpmPackagesList = userConfig.remoteNpmPackages || {};

module.exports = function calculateRemoteNpmPackages(){
    return userRemoteNpmPackagesList;
};