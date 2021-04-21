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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const utils = require('../../packages/utils/index');
module.exports = function ({ queues = [], exportCode = '' }, map, meta) {
    return __awaiter(this, void 0, void 0, function* () {
        this._compiler.NANACHI = this._compiler.NANACHI || {};
        this._compiler.NANACHI.webviews = this._compiler.NANACHI.webviews || [];
        if (utils.isWebView(this.resourcePath)) {
            this._compiler.NANACHI.webviews.push({
                id: this.resourcePath
            });
            queues = [];
            exportCode = '';
        }
        const callback = this.async();
        queues.forEach(({ code = '', path: relativePath }) => {
            if (this.nanachiOptions.platform === 'qq' && /[\/\\](pages|components)[\/\\]/.test(this.resourcePath) && path.parse(this.resourcePath).base === 'index.js') {
                if (!this._compilation.assets[relativePath]) {
                    this.emitFile(path.join(path.dirname(relativePath), 'index.qss'), '', map);
                }
            }
            const fileBaseName = path.basename(relativePath);
            if (this.nanachiOptions.platform === 'wx' && ['app.js', 'app.json', 'app.wxss'].includes(fileBaseName)) {
                const distPath = process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE'
                    ? path.join(process.cwd(), '../../dist/', fileBaseName)
                    : path.join(process.cwd(), '/dist/', fileBaseName);
                fs.ensureFileSync(distPath);
                fs.writeFile(distPath, code, function (err) {
                    if (err) {
                        throw err;
                    }
                });
                return;
            }
            this.emitFile(relativePath, code, map);
        });
        callback(null, exportCode, map, meta);
    });
};
