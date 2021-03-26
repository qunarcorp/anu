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
const config_1 = __importDefault(require("../../config/config"));
const path = __importStar(require("path"));
const index_1 = __importDefault(require("../utils/index"));
const resolve_1 = __importDefault(require("resolve"));
const cwd = process.cwd();
const pkgName = 'schnee-ui';
let installFlag = false;
let patchSchneeUi = false;
function needInstall(pkgName) {
    try {
        resolve_1.default.sync(pkgName, {
            basedir: process.cwd(),
            moduleDirectory: ''
        });
        return false;
    }
    catch (err) {
        return true;
    }
}
function getPatchComponentPath(name) {
    return path.join(cwd, `./node_modules/schnee-ui/components/${name}/index.js`);
}
module.exports = () => {
    return {
        visitor: {
            JSXOpeningElement: function (astPath, state) {
                let pagePath = index_1.default.fixWinPath(state.filename);
                let nodeName = astPath.node.name.name;
                let platConfig = config_1.default[config_1.default.buildType];
                let patchComponents = platConfig.patchComponents;
                if (!patchComponents[nodeName]) {
                    return;
                }
                patchSchneeUi = true;
                const modules = index_1.default.getAnu(state);
                const patchComponentPath = getPatchComponentPath(index_1.default.parseCamel('x-' + nodeName));
                modules.extraModules.push(patchComponentPath);
                modules.importComponents[index_1.default.parseCamel('x-' + nodeName)] = {
                    source: patchComponentPath,
                    sourcePath: pagePath
                };
                config_1.default.patchComponents[nodeName] = config_1.default.patchComponents[nodeName] || patchComponentPath;
                var pagesNeedPatchComponents = platConfig.patchPages || (platConfig.patchPages = {});
                var currentPage = pagesNeedPatchComponents[pagePath] || (pagesNeedPatchComponents[pagePath] = {});
                currentPage[nodeName] = true;
            }
        },
        post: function () {
            if (patchSchneeUi && !installFlag && needInstall(pkgName)) {
                index_1.default.installer(pkgName);
                installFlag = true;
            }
        }
    };
};
