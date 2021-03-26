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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../consts/index");
const fs = __importStar(require("fs-extra"));
const index_2 = __importDefault(require("../../index"));
const config_1 = __importDefault(require("../../config/config"));
const { deepMerge } = require('../../packages/utils/index');
const build = function (args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { beta, betaUi, watch, compress, huawei, analysis, silent, typescript } = args;
            let { buildType } = args;
            const nanachiConfig = {};
            if (buildType === '360') {
                buildType = 'h5';
                config_1.default['360mode'] = true;
            }
            const baseConfig = {
                platform: buildType,
                beta,
                betaUi,
                compress,
                watch,
                huawei,
                analysis,
                silent,
                typescript
            };
            if (fs.existsSync(index_1.NANACHI_CONFIG_PATH)) {
                const userConfig = require(index_1.NANACHI_CONFIG_PATH);
                deepMerge(nanachiConfig, userConfig);
            }
            deepMerge(nanachiConfig, baseConfig);
            index_2.default(nanachiConfig);
        }
        catch (e) {
            console.log(e);
            process.exit(1);
        }
    });
};
module.exports = build;
