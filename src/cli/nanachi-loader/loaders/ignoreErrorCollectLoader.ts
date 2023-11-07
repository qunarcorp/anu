/**
 * 获取源码每一行，然后看是否存在 \/* nanachi-ignore-dependency *\/
 * 如果存在，看这行是否是引入语句，如果是，记录引入模块的路径以及源码的绝对路径，在编译完成后消费
 * 例如：import { View } from '@components/index'; => { '此处是源码路径': { '@components/index': true } }
 * 执行顺序建议在最前，因为只进行收集数据，而且需要收集到注释，而不修改任何源码
 */
module.exports = function(content: string, map: any, meta: any) {
    const lines = content.split('\n');
    const ignoreModulesPath = global.ignoreModulesPath;
    lines.forEach((line: string) => {
        if (line.indexOf('nanachi-ignore-dependency') > -1) {
            const match = line.match(/from\s+['"](.*)['"]/);
            if (match) {
                const modulePath = match[1];
                // 此处不能使用 resourcePath，因为错误堆栈中的信息只能区分到 context 那层，具体不到每个文件
                // 由于涉及到 webpack 的源码，ignoreModulesPath 生成会不太准确，但是也基本可以满足
                // 让我们忽略不准确原因的最终理由为：1.不准确的这部分造成的影响非常小 2. 减少无意义错误的展示本身对打包这一核心过程没有影响
                ignoreModulesPath[this.context] = ignoreModulesPath[this.context] || {};
                ignoreModulesPath[this.context][modulePath] = true;
            }
        }
    });

    return content;
}