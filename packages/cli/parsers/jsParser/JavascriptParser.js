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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const babel = __importStar(require("@babel/core"));
const t = __importStar(require("@babel/types"));
const removeAst = (ast) => {
    if (ast.node.type === 'JSXElement') {
        ast.replaceWith(t.nullLiteral());
    }
    else {
        ast.remove();
    }
};
class JavascriptParser {
    constructor({ code, map, meta, filepath, platform }) {
        this.map = map;
        this.meta = meta;
        this.filepath = filepath;
        this.code = code || fs.readFileSync(this.filepath, 'utf-8');
        this.platform = platform;
        this.relativePath = path.relative(path.resolve(process.cwd(), 'source'), filepath);
        if (/node_modules/.test(filepath)) {
            this.relativePath = path.join('npm', path.relative(path.resolve(process.cwd(), 'node_modules'), filepath));
        }
        else {
            this.relativePath = path.relative(path.resolve(process.cwd(), 'source'), filepath);
        }
        this._babelPlugin = {};
        this.queues = [];
        this.extraModules = [];
        this.parsedCode = '';
        this.ast = null;
        this.componentType = null;
        this.setComponentType();
    }
    setComponentType() {
        if (/\/components\//.test(this.filepath)) {
            this.componentType = 'Component';
        }
        else if (/\/pages\//.test(this.filepath) && !/\/common\//.test(this.filepath)) {
            this.componentType = 'Page';
        }
        else if (/app\.[jt]sx?$/.test(this.filepath)) {
            this.componentType = 'App';
        }
    }
    parse() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield babel.transformAsync(this.code, Object.assign(Object.assign({}, this._babelPlugin), { filename: this.filepath }));
            this.extraModules = res.options.anu && res.options.anu.extraModules || this.extraModules;
            this.parsedCode = res.code;
            this.ast = res.ast;
            return res;
        });
    }
    getCodeForWebpack() {
        const res = babel.transformFromAstSync(this.ast, null, {
            configFile: false,
            babelrc: false,
            comments: false,
            ast: true,
            plugins: [
                function () {
                    return {
                        visitor: {
                            JSXElement: removeAst,
                            ClassProperty: removeAst
                        }
                    };
                }
            ]
        });
        return res.code;
    }
    getExtraFiles() {
        return this.queues;
    }
    getExportCode() {
        let res = this.parsedCode;
        this.extraModules = this.extraModules.filter((m, i, self) => {
            return self.indexOf(m) === i;
        });
        this.extraModules.forEach(module => {
            module = module.replace(/\\/g, '\\\\');
            res = `import '${module}';\n` + res;
        });
        return res;
    }
}
exports.default = JavascriptParser;
