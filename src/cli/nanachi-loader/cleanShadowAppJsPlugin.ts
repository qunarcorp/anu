import webpack from 'webpack';
const fs = require('fs');
const path = require('path');

const id = 'CleanShadowAppJsPlugin';

/**
 * 用于清除单包模式下，为了对子包进行单独打包而生成的 shadow app.js 文件进行编译后删除的动作
 * 也可以用于指定其他自动生成的文件
 */
class CleanShadowAppJsPlugin {
  constructor(options: {pathsToDelete: string[]}) {
    // 传入要删除的源码文件或目录的路径，使用相对路径
    this.pathsToDelete = options.pathsToDelete || [];
  }

  apply(compiler: webpack.Compiler) {
    // compiler.hooks.afterEmit.tapAsync(id, (compilation, callback) => {
    //   this.cleanSourceCode();
    //   callback();
    // });
    compiler.hooks.afterEmit.tap('AfterEmitPlugin', (compilation) => {
        console.log(compiler.options)
        if (!compiler.options.watch) {
            console.log('afterEmit 钩子触发，只给 build 触发');
        }
    });

    compiler.hooks.watchClose.tap(id, () => {
        console.log('watch 关闭钩子');
    });
  }

  cleanSourceCode() {
    this.pathsToDelete.forEach((sourcePath: string) => {
      const fullPath = path.resolve(__dirname, sourcePath); // 获取完整路径
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmdirSync(fullPath, { recursive: true });
        } else {
          fs.unlinkSync(fullPath);
        }
        console.log(`[CleanShadowAppJsPlugin] 指定的文件或者目录已经被删除，路径：${fullPath}`);
      }
    });
  }
}

export default CleanShadowAppJsPlugin;
