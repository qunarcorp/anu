"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config/config"));
const platforms_1 = __importDefault(require("../../consts/platforms"));
let visitor = {
    ClassMethod: {
        enter(astPath) {
            const node = astPath.node;
            const methodName = node.key.name;
            const siblingsNodes = astPath.container;
            const hasCurrentPlatformMethod = siblingsNodes.some(siblingsNode => siblingsNode.type === 'ClassMethod' && siblingsNode.key.name === (methodName + '_' + config_1.default.buildType));
            if (hasCurrentPlatformMethod) {
                astPath.remove();
                return false;
            }
            for (let i = 0, pLen = platforms_1.default.length; i < pLen; i++) {
                const platformType = platforms_1.default[i].buildType;
                if (methodName.endsWith(`_${platformType}`)) {
                    if (platformType === config_1.default.buildType) {
                        const methodNameWithoutSuf = methodName.substr(0, methodName.length - platformType.length - 1);
                        let indexWithoutSuf = -1;
                        for (let j = 0, len = siblingsNodes.length; j < len; j++) {
                            if (siblingsNodes[j].type === 'ClassMethod' && siblingsNodes[j].key.name === methodNameWithoutSuf) {
                                indexWithoutSuf = j;
                                break;
                            }
                        }
                        if (indexWithoutSuf != -1) {
                            astPath.getSibling(indexWithoutSuf).remove();
                        }
                        astPath.node.key.name = methodNameWithoutSuf;
                    }
                    else {
                        astPath.remove();
                    }
                    break;
                }
            }
        }
    }
};
module.exports = function () {
    return {
        visitor: visitor
    };
};
