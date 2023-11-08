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
const cwd = process.cwd();
const fs = require('fs');
let userConfig = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'))).nanachi || {};
let userRemoteNpmPackagesList = userConfig.remoteNpmPackages || {};
module.exports = function calculateRemoteNpmPackages() {
    return userRemoteNpmPackagesList;
};
