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
const path = __importStar(require("path"));
const index_1 = require("./index");
const cwd = process.cwd();
exports.default = (platform) => {
    const baseAlias = {
        'react': './source/' + index_1.REACT_LIB_MAP[platform],
        'react-dom': './source/' + index_1.REACT_LIB_MAP[platform],
        '@react': './source/' + index_1.REACT_LIB_MAP[platform],
        '@components': './source/components'
    };
    const json = require(path.resolve(cwd, 'package.json'));
    const userAlias = json && json.nanachi && json.nanachi.alias || {};
    Object.keys(userAlias).forEach(alias => {
        userAlias[alias] = userAlias[alias].replace(/^(?=[^./\\])/, './');
    });
    return Object.assign({}, baseAlias, userAlias);
};
