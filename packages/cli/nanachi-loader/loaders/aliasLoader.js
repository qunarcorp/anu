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
const path = __importStar(require("path"));
const alias_1 = __importDefault(require("../../consts/alias"));
const calculateAlias_1 = __importDefault(require("../../packages/utils/calculateAlias"));
const config_1 = __importDefault(require("../../config/config"));
const publicPkg_1 = require("../../packages/utils/publicPkg");
const buildType = config_1.default['buildType'];
function managePublicPkgCommonReferenceInAsync(astPath, state) {
    let node = astPath.node;
    let source = node.source.value;
    if (/\.(less|scss|sass|css)$/.test(path.extname(source))) {
        return;
    }
    if (/\/components\//.test(source)) {
        return;
    }
    const specifiers = node.specifiers;
    const currentPath = state.file.opts.sourceFileName;
    const dir = path.dirname(currentPath);
    const sourceAbsolute = path.join(dir, source);
    let currentPageInPackagesIndex = -1, importComponentInPackagesIndex = -1;
    let currentExec, importExec;
    for (let i = 0, len = global.subpackages.length; i < len; i++) {
        const subpackage = global.subpackages[i];
        if (currentPath.startsWith(`${subpackage.resource}`)) {
            currentPageInPackagesIndex = i;
            currentExec = true;
        }
        if (sourceAbsolute.startsWith(`${subpackage.resource}`)) {
            importComponentInPackagesIndex = i;
            importExec = true;
        }
        if (currentExec && importExec) {
            break;
        }
    }
    if (importComponentInPackagesIndex !== -1 && currentPageInPackagesIndex !== importComponentInPackagesIndex) {
        const specifierNameList = specifiers.map(specifier => {
            return specifier.local.name;
        });
        const list = specifierNameList.map(name => `${name} = v.${name};\n`);
        const code = `
            let ${specifierNameList.join(',')};
            require.async("${source}").then(v => {
                ${list}
            }).catch(({v, errMsg}) => {
                console.error("异步获取js出错",v, errMsg);
            })
        `;
        const result = babel.transformSync(code, {
            ast: true,
            sourceType: 'unambiguous'
        });
        astPath.insertAfter(result.ast);
        astPath.remove();
    }
}
function managePublicPkgCommonReferenceInSync(astPath, state) {
    var _a, _b;
    let node = astPath.node;
    let source = node.source.value;
    if (/\.(less|scss|sass|css)$/.test(path.extname(source))) {
        return;
    }
    if (/\/components\//.test(source)) {
        return;
    }
    const currentPath = state.file.opts.sourceFileName.replace(/\.\w+$/, '');
    const dir = path.dirname(currentPath);
    const sourceAbsolute = path.join(dir, source).replace(/\.\w+$/, '');
    if (!sourceAbsolute.startsWith('async/')) {
        return;
    }
    let referenceConfig = ((_a = publicPkg_1.publicPkgCommonReference[sourceAbsolute]) === null || _a === void 0 ? void 0 : _a.subpkgUse) || {};
    let referenceSubName = '';
    if (currentPath.startsWith('async/')) {
        referenceSubName = 'ASYNC';
        let currentDep = ((_b = publicPkg_1.publicPkgCommonReference[currentPath]) === null || _b === void 0 ? void 0 : _b.dependencies) || [];
        currentDep.push(sourceAbsolute);
        publicPkg_1.publicPkgCommonReference[currentPath].dependencies = currentDep;
    }
    else {
        const referenceSubPkg = global.subpackages.find(v => currentPath.startsWith(`${v.resource}`));
        referenceSubName = referenceSubPkg ? referenceSubPkg.resource : 'MAIN';
    }
    let referenceSubFileList = referenceConfig[referenceSubName] || [];
    referenceSubFileList.push(currentPath);
    if (publicPkg_1.publicPkgCommonReference[sourceAbsolute]) {
        publicPkg_1.publicPkgCommonReference[sourceAbsolute].subpkgUse = {
            [referenceSubName]: referenceSubFileList
        };
    }
    else {
        publicPkg_1.publicPkgCommonReference[sourceAbsolute] = {
            subpkgUse: {
                [referenceSubName]: referenceSubFileList,
            },
            name: source,
        };
    }
}
const visitor = {
    ImportDeclaration(astPath, state) {
        if (config_1.default.requireAsync) {
            managePublicPkgCommonReferenceInAsync(astPath, state);
            return;
        }
        else {
            managePublicPkgCommonReferenceInSync(astPath, state);
        }
    },
};
function checkRequireAsync() {
    return {
        visitor
    };
}
function resolveAlias(code, aliasMap, relativePath, ast, ctx) {
    const babelConfig = {
        ast: true,
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
            ],
            config_1.default.publicPkg ? checkRequireAsync : {},
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
                ast = res.ast;
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
