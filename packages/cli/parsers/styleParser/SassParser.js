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
const StyleParser_1 = __importDefault(require("./StyleParser"));
const index_1 = require("../../consts/index");
const path = __importStar(require("path"));
const calculateAlias = require('../../packages/utils/calculateAlias');
class SassParser extends StyleParser_1.default {
    constructor(props) {
        super(props);
        this._postcssPlugins = this._postcssPlugins.concat([
            require('postcss-import')({
                resolve: function (importer, baseDir) {
                    if (!/\.s[ca]ss$/.test(importer)) {
                        importer = importer + '.scss';
                    }
                    var filePathAbPath = path.join(baseDir, calculateAlias(props.filepath, importer));
                    return filePathAbPath;
                },
                plugins: this.platform !== 'h5' ? [
                    require('../../packages/postcssPlugins/postCssPluginRemoveRules')
                ] : []
            }),
            require('@csstools/postcss-sass'),
            ...this.platform !== 'h5' ? [
                require('../../packages/postcssPlugins/postCssPluginAddImport')({
                    extName: index_1.MAP[this.platform]['EXT_NAME'][this.type],
                    type: this.type
                }),
            ] : [
                require('../../packages/postcssPlugins/postCssPluginRpxToRem'),
                require('../../packages/postcssPlugins/postCssPluginAddStyleHash')
            ],
            require('../../packages/postcssPlugins/postCssPluginFixNumber'),
            require('../../packages/postcssPlugins/postCssPluginValidateStyle'),
            require('../../packages/postcssPlugins/postCssPluginTransformKeyFrames'),
            require('../../packages/postcssPlugins/postCssPluginRemoveComments')
        ]);
        this._postcssOptions = {
            from: this.filepath,
            syntax: require('postcss-scss')
        };
    }
}
exports.default = SassParser;
