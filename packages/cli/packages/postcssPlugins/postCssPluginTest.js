"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postcss_1 = __importDefault(require("postcss"));
const postCssPluginTest = postcss_1.default.plugin('postcss-plugin-test', function ({ extName, type } = {}) {
    return function (root, res) {
    };
});
module.exports = postCssPluginTest;
