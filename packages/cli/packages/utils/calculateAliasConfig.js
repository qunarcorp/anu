"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const { REACT_LIB_MAP } = require('../../consts/index');
const path = __importStar(require("path"));
const config = require('../../config/config');
const cwd = process.cwd();
const fs = require('fs');
let userConfig = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'))).nanachi || {};
let userAlias = userConfig.alias || {};
module.exports = function calculateAliasConfig() {
    let React = REACT_LIB_MAP[config.buildType];
    let ret = {};
    if (userAlias) {
        Object.keys(userAlias).forEach(function (key) {
            if (key[0] !== '@') {
                throw '别名必须以@开头';
            }
            ret[key] = path.join(cwd, userAlias[key]);
        });
    }
    return Object.assign({
        'react': path.join(cwd, `source/${React}`),
        '@react': path.join(cwd, `source/${React}`),
        'react-dom': path.join(cwd, `source/${React}`),
        '@common': path.join(cwd, 'source/common'),
        '@assets': path.join(cwd, 'source/assets'),
        '@components': path.join(cwd, 'source/components')
    }, ret);
};
