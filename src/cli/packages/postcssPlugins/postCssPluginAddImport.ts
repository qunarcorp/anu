import postCss from 'postcss';
import * as path from 'path';
import utils from '../utils';
import config from '../../config/config';

// 前边使用了 postcss-import 后边又尝试把 @import 语句加回来
// 但是后缀名不再是 css sass scss less，而是采用对应平台的样式文件后缀名
// 通过正常调用 postcss-import，然后调用预处理器的postcss插件，再到回来加入 @import 语句，完成了：
// 1. 预处理器的正常编译
// 2. 每个平台正常引入外联样式表
const postCssPluginAddImport = postCss.plugin('postcss-plugin-add-import', function({ extName, type }: any = {}) {
    return function(root, res) {
        const deps = utils.getDeps(res.messages);
        function getRelativeImportPath(dirname: string, filepath: string) {
            const reg = (type === 'sass' ? /\.(s[c|a]ss)$/ : /\.(less)$/);
            return '\'' + path.relative(dirname, filepath)
                .replace(reg, `.${extName || '$1' }`)
                .replace(/(^\w)/, './$1') +
                '\'';
        }
        if (!deps.length) {
            return;
        }
        // 保证只有一条css规则的情况下也有分号（有些平台@import语句必须以分号结束）
        root.raws.semicolon = true;
        for (var i = deps.length - 1; i >= 0; i--) {
            let importPath = getRelativeImportPath(path.dirname(res.opts.from), deps[i].file).replace(/\\/g, '/');
            if (config['buildType'] === 'quick') {
                importPath = importPath.replace(/\.s[ac]ss(')?$/, '.css$1');
            }
            // 遍历依赖插入@import语句
            const importNode = postCss.atRule({
                name: 'import',
                params: importPath
            });
            root.insertBefore(root.nodes[0], importNode);
        }
    };
});

module.exports = postCssPluginAddImport;
