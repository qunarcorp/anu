"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lintQueue_1 = __importDefault(require("../utils/lintQueue"));
module.exports = function mapConfigName(config, patch, sourcePath) {
    if (config.window) {
        modifyValue(config.window, sourcePath);
    }
    modifyValue(config, sourcePath);
};
const mapColor = {
    "#fff": "white",
    "#ffffff": "white",
    '#000': 'black',
    '#000000': 'black',
};
const mapBg = {
    "#fff": "light",
    "#ffffff": "light",
    '#000': 'dark',
    '#000000': 'dark',
};
function modifyValue(object, sourcePath) {
    var p = sourcePath.split(/\/source\//).pop();
    var barColor = object.navigationBarTextStyle, color, bg;
    if (barColor !== 'white' && barColor !== 'black') {
        color = mapColor[barColor] || 'white';
        if (barColor) {
            lintQueue_1.default.push({
                level: 'warn',
                msg: `${p} 里navigationBarTextStyle的值为${barColor}, 强制转换为${color}.`
            });
            object.navigationBarTextStyle = color;
        }
    }
    else {
        color = barColor;
    }
    var barBg = object.backgroundTextStyle;
    if (barBg !== 'dark' && barBg !== 'light') {
        bg = mapBg[barBg];
        if (!bg) {
            bg = color === 'white' ? 'dark' : 'light';
        }
        if (barBg) {
            object.backgroundTextStyle = bg;
            lintQueue_1.default.push({
                level: 'warn',
                msg: `${p}里backgroundTextStyle的值为${barBg}, 强制转换为${bg}.`
            });
        }
    }
}
