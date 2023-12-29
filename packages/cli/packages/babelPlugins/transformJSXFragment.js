"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const t = __importStar(require("@babel/types"));
let visitor = {
    JSXFragment: {
        enter(astPath) {
            astPath.replaceWith(t.jSXElement(t.jsxOpeningElement(t.jsxIdentifier('view'), []), t.jSXClosingElement(t.jsxIdentifier('view')), astPath.node.children));
        }
    },
};
module.exports = function () {
    return {
        visitor: visitor
    };
};
