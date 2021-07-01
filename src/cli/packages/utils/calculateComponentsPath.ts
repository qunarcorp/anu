import * as path from 'path';
import getDistPath from './getDistPath';
import calculateAlias from './calculateAlias';
import config from '../../config/config';
import utils from '.';
const cwd = process.cwd();


/**
 * case1: userPath/source/components/Calendar/index => /components/Calendar/index
 * case2: userPath/demo/source/pages/syntax/components/Label/index => /pages/syntax/components/Label/index
 * case3: userPath/demo/node_modules/schnee-ui/components/XButton/index.js => /npm/schnee-ui/components/XButton/index
 */
function fixWinPath(p: string) {
    return p.replace(/\\/g, '/');
}
function calculateComponentsPath( bag: any ) {
    
    if (!path.isAbsolute(bag.sourcePath)) {
        console.error('bag.sourcePath 必须为绝对路径.');
        process.exit(1);
    }

    //求出引用模块的真实绝对路径 如：userPath/source/components/Calendar/index
   
    let realPath = path.join(
        path.dirname(bag.sourcePath),
        calculateAlias(bag.sourcePath, bag.source, [], bag.importSpecifierName) //引用模块的相对路径
    );
    

    

    
    realPath = getDistPath(fixWinPath(realPath).replace(/\.js$/, ''));

    

    // 非快应用useComponents是绝对路径, 快应用会经过mergeUx.js计算得到相对路径
    //  usingComponents: {
    //     "A": "/components/xxx/yyy"
    //  }
    //  <import name="xxx" src="../../xxx/yyy"></import>
    
    const usingPath = config.buildType !== 'quick'
        ? realPath.replace(fixWinPath(path.join(utils.getProjectRootPath(), config.buildDir)), '')
        : realPath;
    return usingPath;
};

module.exports = calculateComponentsPath;
export default calculateComponentsPath;