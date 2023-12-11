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
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const index_1 = __importDefault(require("../../packages/utils/index"));
const install_1 = __importDefault(require("../../bin/commands/install"));
const isMutilePack_1 = require("./isMutilePack");
function installDefaultModule(buildType) {
    return __awaiter(this, void 0, void 0, function* () {
        const defaultModuleConsts = require(path_1.default.join(index_1.default.getProjectRootPath(), 'node_modules/@qnpm/chaika-patch/defaultModuleConsts'));
        const installModules = defaultModuleConsts.map(function (curModule) {
            return Object.assign({}, {
                name: curModule.name,
                installModulePath: path_1.default.join(index_1.default.getProjectRootPath(), '.CACHE/download', isMutilePack_1.getMultiplePackDirPrefix(), curModule.name),
                installVersion: curModule.versions[buildType]
            });
        });
        for (let i of installModules) {
            i.exists = yield fs_extra_1.default.pathExists(i.installModulePath);
        }
        for (const curModule1 of installModules.filter(function (curModule) {
            return !curModule.exists;
        })) {
            yield install_1.default(`${curModule1.name.replace(/^(nnc_module_)|(nnc_)/, '')}@#${curModule1.installVersion}`, {});
        }
    });
}
exports.default = installDefaultModule;
