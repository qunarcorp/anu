"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const JavascriptParser_1 = __importDefault(require("./JavascriptParser"));
const config_1 = __importDefault(require("../../config/config"));
const thePathHasCommon = /\bcommon\b/;
const buildType = config_1.default.buildType;
class WxParser extends JavascriptParser_1.default {
    constructor(props) {
        super(props);
        this.filterCommonFile = thePathHasCommon.test(this.filepath) ? [] : require('../../packages/babelPlugins/transformMiniApp')(this.filepath);
        this._babelPlugin = {
            configFile: false,
            babelrc: false,
            comments: false,
            ast: true,
            plugins: [
                [require('@babel/plugin-proposal-decorators'), { legacy: true }],
                [
                    require('@babel/plugin-proposal-class-properties'),
                    { loose: true }
                ],
                require('@babel/plugin-proposal-object-rest-spread'),
                [
                    require('babel-plugin-import').default,
                    {
                        libraryName: 'schnee-ui',
                        libraryDirectory: 'components',
                        camel2DashComponentName: false
                    }
                ],
                require('@babel/plugin-syntax-jsx'),
                require('@babel/plugin-syntax-optional-chaining'),
                require('../../packages/babelPlugins/collectDependencies'),
                require('../../packages/babelPlugins/collectTitleBarConfig'),
                require('../../packages/babelPlugins/patchComponents'),
                ...require('../../packages/babelPlugins/transformEnv'),
                [require('@babel/plugin-transform-template-literals'), { loose: true }],
                require('../../packages/babelPlugins/transformIfImport'),
                require('../../packages/babelPlugins/transformIfFun'),
                ...this.filterCommonFile,
                require('@babel/plugin-proposal-optional-chaining'),
                ...require('../../packages/babelPlugins/patchAsyncAwait'),
                require('../../packages/babelPlugins/collectCommonCode'),
            ]
        };
    }
    parse() {
        const _super = Object.create(null, {
            parse: { get: () => super.parse }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield _super.parse.call(this);
            this.queues = res.options.anu && res.options.anu.queue || this.queues;
            this.extraModules = res.options.anu && res.options.anu.extraModules || this.extraModules;
            this.queues.push({
                type: 'js',
                path: this.relativePath,
                code: res.code,
                ast: this.ast,
                fileMap: res.map,
                extraModules: this.extraModules
            });
            return res;
        });
    }
}
exports.default = WxParser;
