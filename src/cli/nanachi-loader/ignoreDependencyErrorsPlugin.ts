import webpack from 'webpack';
import globalStore from '../packages/utils/globalStore';

const id = 'IgnoreDependencyErrorsPlugin';

/**
 * 可以在 webpack 编译阶段结束后，检查编译结果中抛出的异常
 * 过滤条件为：
 * 1. 是 ModuleNotFoundError 类型的
 * 2. 查询 errors 中每个 err 的 message ，对照 ignoreModulesPath
 * 如果匹配到了，则过滤掉该错误
 */
class IgnoreDependencyErrorsPlugin {
    apply(compiler: webpack.Compiler) {
        
        compiler.hooks.afterCompile.tap(id, (compilation) => {
            const ignoreModulesPath = globalStore.ignoreModulesPath;

            if (Object.keys(ignoreModulesPath).length === 0) {
                return;
            }

            /*
            ModuleNotFoundError: can't resolve ... in ... 跟
            Error: Cannot find module xxx from xxx 不是一类错误
            */
            const errors = compilation.errors.filter((err: any) => {
                try {
                    if (err.name === 'ModuleNotFoundError') {
                        const msg = err.message;
                        const matchKey = msg.match(/Can't resolve '(.+?)'/);
                        const matchValue = msg.match(/in '(.+?)'/);

                        if (matchKey && matchKey[1] && matchValue && matchValue[1]) {
                            const moduleImportPath = matchKey[1];
                            const moduleResourcePath = matchValue[1];
                            const modulePath = ignoreModulesPath[moduleResourcePath];
                            if (modulePath && modulePath[moduleImportPath]) {
                                // moduleResourcePath 存在且其中包含 moduleImportPath，则过滤掉该 error
                                return false; 
                            }
                        }
                    }
                    return true;
                } catch (e) {
                    return true;
                }
            });

            // 此处过滤掉的 errors 不会影响最后编译完成后的各项统计
            // 而且我们也只过滤层层筛选之后的特定 error
            compilation.errors = errors;
        });
    }
}

export default IgnoreDependencyErrorsPlugin;