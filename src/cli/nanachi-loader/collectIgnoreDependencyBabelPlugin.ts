import globalStore from "../packages/utils/globalStore";

export default () => {
    // 获取源码中声明引入语句的每一行，然后看是否存在 \/* nanachi-ignore-dependency *\/
    // 如果存在，看这行是否是引入语句，如果是，记录引入模块的路径以及源码的绝对路径，在编译完成后消费
    // 例如：import { View } from '@components/index'; => { '此处是源码路径': { '@components/index': true } }

    const vistor = {
        Program: {
            enter(path, state) {
                state.ignoreModulesPath = {};
            },
            exit(path, state) {
                if (Object.keys(state.ignoreModulesPath).length === 0) {
                    return;
                }
                // 错误堆栈中只能收集到 context 例如
                // /source/pages/flight/ota/logic/index.js 中存在引入语句异常，在错误堆栈中只能定位到上一层 /source/pages/flight/ota/logic
                // 所以需要截取文件路径，即使会有一些误差，我们也只能存储 context，而不是 babel 插件中的原始 fileName
                const match = state.file.opts.filename.match(/(.*)\/.*\..*$/);
                if (!match) {
                    return;
                }

                const context = match[1];
                if (globalStore.ignoreModulesPath[context] === undefined) {
                    globalStore.ignoreModulesPath[context] = state.ignoreModulesPath;
                } else {
                    globalStore.ignoreModulesPath[context] = {
                        ...globalStore.ignoreModulesPath[context],
                        ...state.ignoreModulesPath
                    };
                }
            }
        },
        ImportDeclaration(path, state) {
            const node = path.node;
            const ignoreModulesPath = state.ignoreModulesPath;
            const modulePath = node.source.value;
            
            // 仅支持开头注释，例如   /* nanachi-ignore-dependency */import EventEmitter from '@common/utils/EventEmitter';
            if (node.leadingComments) {
                node.leadingComments.forEach((comment) => {
                    if (comment.value.indexOf('nanachi-ignore-dependency') > -1) {
                        // console.log('path:', state.file.opts.filename);
                        // console.log('node:', node);
                        ignoreModulesPath[modulePath] = true;
                    }
                });
            }
        }
    };

    return {
        name: 'babel-plugin-collect-ignore-dependency',
        visitor: vistor
    }
}
