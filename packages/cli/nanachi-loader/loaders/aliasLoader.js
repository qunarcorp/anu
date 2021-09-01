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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../consts/index");
const babel = __importStar(require("@babel/core"));
const alias_1 = __importDefault(require("../../consts/alias"));
const calculateAlias_1 = __importDefault(require("../../packages/utils/calculateAlias"));
function resolveAlias(code, aliasMap, relativePath, ast, ctx) {
    const babelConfig = {
        configFile: false,
        babelrc: false,
        sourceMaps: true,
        comments: false,
        sourceFileName: relativePath,
        plugins: [
            [
                require('babel-plugin-module-resolver'),
                {
                    resolvePath(moduleName) {
                        return calculateAlias_1.default(ctx.resourcePath, moduleName, ctx._compiler.options.externals);
                    }
                }
            ]
        ]
    };
    let result;
    if (ast) {
        result = babel.transformFromAstSync(ast, null, babelConfig);
    }
    else {
        result = babel.transformSync(code, babelConfig);
    }
    return result;
}
module.exports = function ({ queues = [], exportCode = '' }, map, meta) {
    return __awaiter(this, void 0, void 0, function* () {
        const aliasMap = alias_1.default(this.nanachiOptions.platform);
        let ctx = this;
        const callback = this.async();
        queues = queues.map((item) => {
            let { code = '', path: filePath, type, ast, fileMap } = item;
            const relativePath = type ? filePath.replace(/\.\w+$/, `.${index_1.MAP[this.nanachiOptions.platform]['EXT_NAME'][type] || type}`) : filePath;
            let res;
            if (type === 'js') {
                res = resolveAlias(code, aliasMap, relativePath, ast, ctx);
                code = res.code;
            }
            if (type === 'ux') {
                code = code.toString().replace(/<script>([\s\S]*?)<\/script>/mg, function (match, jsCode) {
                    jsCode = resolveAlias(jsCode, aliasMap, relativePath, ast, ctx).code;
                    return `<script>${jsCode}</script>`;
                });
            }
            return Object.assign(Object.assign({}, item), { fileMap: res ? res.map : fileMap, code, path: relativePath, type,
                ast });
        });
        callback(null, { queues, exportCode }, map, meta);
    });
};
