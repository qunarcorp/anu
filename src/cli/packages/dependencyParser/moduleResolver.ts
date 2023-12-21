import fs from 'fs-extra';
import path from 'path';
import { isDirectory } from './utils';

function resolveBabelSyntaxPlugins(modulePath: string) {
    const plugins: string[] = [];
    if (['.tsx', '.jsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('jsx');
    }
    if (['.ts', '.tsx'].some(ext => modulePath.endsWith(ext))) {
        plugins.push('typescript');
    }
    return plugins;
}

// 补全路径，类似于 webpack 中使用 resolve.extension 猜测并不全路径
function completeModulePath (modulePath: string) {
    const EXTS = ['.js', '.jsx', '.ts', '.tsx']; // 按照顺序放置，优先级高的放前面

    const extsRegex = new RegExp(`(\\${EXTS.join('|\\')})$`);

    // 带后缀直接返回
    if (modulePath.match(extsRegex)) {
        return modulePath;
    }

    function tryCompletePath (resolvePath: (ext: string) => string) {
        for (let i = 0; i < EXTS.length; i ++) {
            let tryPath = resolvePath(EXTS[i]);
            if (fs.existsSync(tryPath)) {
                return tryPath;
            }
        }
    }

    // 先测试根据 EXTS 补全文件后缀来判断文件存不存在
    if (!EXTS.some(ext => modulePath.endsWith(ext))) {
        const tryModulePath = tryCompletePath((ext) => modulePath + ext);
        if (!tryModulePath) {
            throw 'module not found: ' + modulePath;
        } else {
            return tryModulePath;
        }
    }

    // 处理默认引入文件夹路径下的 index.js
    if (isDirectory(modulePath)) {
        // 即使某个路径是文件夹，也可能存在同目录下同名的文件，需要排除一下
        const tryModulePathWithExt = tryCompletePath((ext) => modulePath + ext);
        if (tryModulePathWithExt) {
            return tryModulePathWithExt;
        }
        // 然后再看文件夹下的 index.xx
        const tryModulePath = tryCompletePath((ext) => path.join(modulePath, 'index' + ext));
        if (!tryModulePath) {
            throw 'module not found: ' + modulePath;
        } else {
            return tryModulePath;
        }
    }

    // return tryCompletePath((ext) => modulePath + ext);
    return modulePath;
}

// 模块解析器，根据代码中引入的模块的信息，还原出项目中的真实路径
function moduleResolver (curModulePath: string, requirePath: string, visitedModules: Set<string>) {
    requirePath = path.resolve(path.dirname(curModulePath), requirePath);
    requirePath = completeModulePath(requirePath);

    if (visitedModules.has(requirePath)) {
        return '';
    } else {
        visitedModules.add(requirePath);
    }
    return requirePath;
}

export {moduleResolver, resolveBabelSyntaxPlugins};
