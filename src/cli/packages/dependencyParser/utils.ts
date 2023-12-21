import { JS_ATTRIBUTE_TYPE, JS_FILE_GROUP, FILE_EXT_MAP } from './const';
import path from 'path';
import fs from 'fs-extra';

/**
 * 通过 path 判定该文件在小程序中的类型
 * @param filePath 文件绝对路径
 * @param platform 小程序平台
 */
const judgeJsAttributeTypeByPath = (filePath: string, platform: string) => {
    const extName = path.extname(filePath);
    if (!extName) return JS_ATTRIBUTE_TYPE.OTHER;

    if (JS_FILE_GROUP.some(ext => ext === extName)) {
        const fileName = path.basename(filePath, extName);

        if (fileName === 'app') {
            const jsonPath = filePath.replace(extName, '.json');
            if (fs.existsSync(jsonPath)) {
                return JS_ATTRIBUTE_TYPE.APP;
            }
        }
        if (fileName === 'index') {
            // 同层存在 xml 以及 json
            // @ts-ignore
            const xmlPath = filePath.replace(extName, FILE_EXT_MAP[platform].xml);
            const jsonPath = filePath.replace(extName, '.json');
            const json = require(jsonPath);
            if (fs.existsSync(xmlPath) && !json.component) {
                return JS_ATTRIBUTE_TYPE.PAGE;
            }
            if (fs.existsSync(xmlPath) && json.component) {
                return JS_ATTRIBUTE_TYPE.COMPONENT;
            }
        }

        return JS_ATTRIBUTE_TYPE.SCRIPT; // 只能算是脚本类型
    } else {
        return JS_ATTRIBUTE_TYPE.OTHER;
    }
};

const isDirectory = (filePath: string) => {
    try {
        return fs.statSync(filePath).isDirectory();
    }catch (e) {}
    return false;
};


export {
    judgeJsAttributeTypeByPath,
    isDirectory
};
