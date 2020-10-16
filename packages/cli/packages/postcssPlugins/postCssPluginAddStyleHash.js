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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postcss_1 = __importDefault(require("postcss"));
const path = __importStar(require("path"));
const utils_1 = __importDefault(require("../utils"));
const postcss_selector_parser_1 = __importDefault(require("postcss-selector-parser"));
const postCssPluginAddStyleHash = postcss_1.default.plugin('postcss-plugin-add-style-hash', function () {
    return function (root, res) {
        const styleHash = utils_1.default.getStyleNamespace(path.dirname(res.opts.from));
        root.walkRules(rule => {
            if (rule.selector && rule.parent.type !== 'atrule') {
                rule.selector = postcss_selector_parser_1.default((selector) => {
                    selector.walk(s => {
                        if (s.type === 'selector' && s.parent.type !== 'pseudo') {
                            s.nodes.unshift(postcss_selector_parser_1.default.attribute({
                                attribute: styleHash
                            }));
                        }
                    });
                }).processSync(rule.selector, {
                    lossless: false
                });
            }
        });
    };
});
module.exports = postCssPluginAddStyleHash;
