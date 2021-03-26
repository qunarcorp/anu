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
const copySource_1 = __importDefault(require("./copySource"));
const mergeFiles_1 = __importDefault(require("./mergeFiles"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const cwd = process.cwd();
function makeSymLink() {
    let currentNpmDir = path.join(cwd, 'node_modules');
    let targetNpmDir = path.join(cwd, '.CACHE/nanachi/node_modules');
    if (!fs.existsSync(targetNpmDir)) {
        fs.symlinkSync(currentNpmDir, targetNpmDir);
        return;
    }
}
function removeDir(p) {
    try {
        fs.removeSync(p);
    }
    catch (err) {
    }
}
function default_1() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield removeDir(path.join(cwd, '.CACHE/nanachi'));
            yield copySource_1.default();
            yield mergeFiles_1.default();
            makeSymLink();
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.default = default_1;
;
