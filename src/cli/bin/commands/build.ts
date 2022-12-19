
import { NANACHI_CONFIG_PATH } from '../../consts/index';
import * as fs from 'fs-extra';
import nanachi from '../../index';
import config from '../../config/config';
import utils from '../../packages/utils';
const { deepMerge } = require('../../packages/utils/index');
interface BulidOptions {
    watch: boolean;
    buildType: string;
    [props: string]: any;
}

const build = async function(args: BulidOptions) {
    try {
        const { beta, betaUi, watch, compress, huawei, analysis, silent, future, breakchange, typescript, dir=''} = args;
        let { buildType } = args;
      
        const nanachiConfig = {};
        // 360补丁
        if (buildType === '360') {
            buildType = 'h5';
            config['360mode'] = true;
        }
        const baseConfig = {
            platform: buildType,
            beta,
            betaUi,
            compress,
            watch,
            huawei,
            analysis,
            silent,
            future,
            breakchange,
            typescript,
            dir
        };

       
       
        // if (buildType !== 'quick' && dir) {
        //     config.buildDir = config.buildDir.replace(/\/$/, '') + '/' + dir.replace(/^\//, '');
        // }

        config.buildDir = utils.getDistRelativeDir();


        // 合并nanachi.config.js中的用户自定义配置
        if (fs.existsSync(NANACHI_CONFIG_PATH)) {
            const userConfig = require(NANACHI_CONFIG_PATH);
            deepMerge(nanachiConfig, userConfig);
        }
        deepMerge(nanachiConfig, baseConfig);
        
        nanachi(nanachiConfig);

    } catch (e) {
        // eslint-disable-next-line
        console.log(e);
        process.exit(1);
    }
}

// export default build;
module.exports = build;

