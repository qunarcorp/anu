"use strict";
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
const t = __importStar(require("@babel/types"));
const generator_1 = __importDefault(require("@babel/generator"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const utils_1 = __importDefault(require("../utils"));
function isChaikaMode() {
    return process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
}
const fnNameList = ['ownKeys', '_objectSpread', '_defineProperty', 'asyncGeneratorStep', '_asyncToGenerator'];
const cwd = process.cwd();
const closureCache = [];
const visitor = {
    Program: {
        exit(astPath, state) {
            astPath.traverse({
                FunctionDeclaration: {
                    exit: (astPath, state) => {
                        const curFnName = astPath.node.id.name;
                        if (!fnNameList.includes(curFnName))
                            return;
                        this.injectInportSpecifiers.push(curFnName);
                        if (!closureCache.find(el => el.name === curFnName)) {
                            closureCache.push({
                                code: generator_1.default(astPath.node).code,
                                name: curFnName
                            });
                            this.needWrite = true;
                        }
                        astPath.remove();
                    }
                }
            });
            if (!this.injectInportSpecifiers.length)
                return;
            const importSourcePath = path_1.default.relative(path_1.default.parse(utils_1.default.getDistPathFromSoucePath(state.filename)).dir, this.distCommonPath);
            const specifiersAst = this.injectInportSpecifiers.map(name => t.importSpecifier(t.identifier(name), t.identifier(name)));
            const sourceAst = t.StringLiteral(!/^\./.test(importSourcePath) ? `./${importSourcePath}` : importSourcePath);
            astPath.node.body.unshift(t.importDeclaration(specifiersAst, sourceAst));
        }
    }
};
module.exports = [
    function () {
        return {
            pre() {
                this.injectInportSpecifiers = [];
                this.distCommonPath = path_1.default.join(utils_1.default.getDistDir(), 'internal/runtimecommon.js');
                this.needWrite = false;
            },
            visitor,
            post() {
                if (process.env.JENKINS_URL && process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE')
                    return;
                this.injectInportSpecifiers = [];
                if (!this.needWrite)
                    return;
                const codesList = closureCache.map(el => el.code);
                const exportCode = codesList.reduce(function (acc, curCode) {
                    return acc + `export ${curCode}\n\n\n`;
                }, '');
                fs.ensureFileSync(this.distCommonPath);
                fs.writeFileSync(this.distCommonPath, exportCode);
            }
        };
    }
];
