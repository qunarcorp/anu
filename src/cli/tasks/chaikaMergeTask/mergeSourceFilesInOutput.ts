import {
    validateConfigJsonIsExistInSource,
    xDiff,
    generateMetaFilesMap,
    getUniqueSubPkgConfig
} from './mergeUtils';
import utils from '../../packages/utils';
import {getMultiplePackDirPrefixNew} from './isMutilePack';

const generateAppJsonFromXConfigJson = require('../../packages/babelPlugins/generateAppJsonFromXConfigJson');
const {setSubPackage} = require('../../packages/utils/setSubPackage');
const {mergeConfigJson} = require('../../packages/utils/mergeConfigJson');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

// 在产物类型的包里，我们只检查 xConfig.json，具体原因看这个文件其他的注释
function collectWaitedMergeFiles(dirPath: string) {
    const sourceConfigJsonExistedPath = validateConfigJsonIsExistInSource(dirPath);

    const needMergeFileList: string[] = [];
    // 参考 copyDownLoadToNnc 构造出需要特殊处理的文件
    if (sourceConfigJsonExistedPath) {
        needMergeFileList.push(sourceConfigJsonExistedPath);
    }
    return needMergeFileList;
}

/**
 * 获取多个包的 xxConfig.json，然后合并
 * 功能上跟另一个函数 getMergedXConfigContent 类似，但直接返回对象，跳过序列化反序列化
 */
function getMergedXConfigContentReturnObject(config: any) {
    let ret = xDiff(config);

    // subpackages 字段去重
    for (let i in ret) {
        if (i.toLocaleLowerCase() === 'subpackages') {
            ret[i] = getUniqueSubPkgConfig(ret[i]);
        }
    }

    return ret;
}

/**
 * 从指定目录列表中收集所有的pages字符串，返回数组
 * 不确保是否存在重复的，因为其他流程会去重
 */
function collectAllPagesFromAppJson(waitedMergeProjectDirList: string[]) {
    const res: string[] = [];

    waitedMergeProjectDirList.forEach((dir: string) => {
        const appJsonPath = path.join(dir, 'app.json');
        if (fs.existsSync(appJsonPath)) {
            const appJson = require(appJsonPath);
            if (appJson.pages && appJson.pages.length) {
                res.push(...appJson.pages);
            }
        }
    });

    return res;
}

function checkPluginAndDeleteName(xConfigJson: any) {
    if (xConfigJson.plugins && Object.keys(xConfigJson.plugins).length) {
        for (let item in xConfigJson.plugins) {
            if (xConfigJson.plugins[item].name) {
                delete xConfigJson.plugins[item].name;
            }
        }
    }
}

// 将合并后的 Xconfig 内容，根据 miniappVistor 中的规则，增量修改到最终产物的 app.json 中
function traverseMergedXConfigToAppJson(map: any, waitedMergeProjectDirList: any) {
    // 先根据旧规则获取到 xconfig 合并后的内容，再去模拟生成 app.json 的逻辑，从而进行增量修改
    if (!map.xconfig) return {dist: '', content: ''}; // 不去处理任何文件
    let xConfigJson = getMergedXConfigContentReturnObject(map.xconfig); // 合并后的 XConfig 内容

    // 这里只能手动删除一下 plugin[item].name，旧版删除的逻辑在 pretasks.ts 中
    // TODO 有需要的话兼容 tagName 字段
    checkPluginAndDeleteName(xConfigJson);

    /* 处理 json 配置开始*/
    // 获取到重新合并的 xConfig，然后基于此去替换原来的 app.json，这部分逻辑最大程度上还原之前的逻辑
    // 适配的流程参考 https://wiki.corp.qunar.com/pages/viewpage.action?pageId=805709565
    // 1. 构造一个 json 对象，用于作为后续的输入
    // finalAppJsonPath 永远指向 dist / target 目录，为合并后最终产物的固定目录
    const finalAppJsonPath: string = path.join(utils.getFixedDistDir(false), getMultiplePackDirPrefixNew(), 'app.json');
    let json = {} as any;
    try {
        json = require(finalAppJsonPath);
    } catch(err) {
        console.error(chalk.red(`[traverseMergedXConfigToAppJson] 读取产物 app.json 失败，请联系开发者`));
        process.exit(1);
    }
    // console.log('[traverseMergedXConfigToAppJson] finalAppJson before:', json);

    // 2.往 json 的 pages 中塞入冗余的数据，然后走原来的 setSubPackage 流程去重新去重和处理
    const redundantPages = collectAllPagesFromAppJson(waitedMergeProjectDirList);
    json.pages = json.pages.concat(redundantPages);
    setSubPackage(json, xConfigJson);

    // 3.调用原来的 mergeConfigJson 去处理 json 文件
    json = mergeConfigJson(json);

    // 4.调用原来的 generateAppJsonFromXConfigJson 处理剩余字段
    generateAppJsonFromXConfigJson(xConfigJson, json);

    /* 处理 json 配置结束*/
    // console.log('[traverseMergedXConfigToAppJson] finalAppJson after:', json);

    return {
        dist: finalAppJsonPath,
        content: JSON.stringify(json, null, 4)
    };
}

/**
 * 该函数会在存在需要合并的产物类型子包存在的情况下被调用，不论是单包还是多包
 * 修改这部分源码前，建议将 miniAppVistor.program 中生成 app.json 的逻辑完全读一遍
 * 产物包的非源码文件的合并和 chaika 模式下进行各种文件合并的逻辑是完全不同的，是独立的
 * 由于待合并的文件都是在多次编译流程结束之后才产生的，所以只能通过 webpack plugin 指定时机去调用，而无法像原来走 babel
 * @param waitedMergeProjectDirList 传入需要进行扫描需要合并文件的项目目录列表
 */
export default function (waitedMergeProjectDirList: string[]) {
    // 获取去重后的所有需要进行合并的文件列表，来源限制在 waitedMergeProjectDirList 提供的目录下
    // const needMergeFileList = Array.from(new Set(waitedMergeProjectDirList.map(collectWaitedMergeFiles).flat())); // flat node 12 才支持不一定能用
    const needMergeFileList = Array.from(new Set([].concat(...waitedMergeProjectDirList.map(collectWaitedMergeFiles))));

    let map :any;
    if (needMergeFileList.length) {
        // 只有 needMergeFileList 有传入的路径时，我们会手动加入固定的最终产物路径进来，因为合并的话一定需要该目录下的 app.json 以及 xConfig
        const finalDistPath: string = path.join(utils.getFixedDistDir(false), getMultiplePackDirPrefixNew());
        map = generateMetaFilesMap(Array.from(new Set([...needMergeFileList].concat(...collectWaitedMergeFiles(finalDistPath)))));
    } else {
        map = {}; // 跳过后续所有流程
    }

    /**
     * 实际上在编译后，我们只需要对 Xconfig 中的内容进行处理，因为其他类型的文件都根据编译流程核对过，仅对编译流程有效
     * 而单包产物已经生成，所以再合并这些内容也没什么用了。但 Xconfig 在合并之后，会经过 miniAppVistor 对最终的 app.json 中的内容进行修改
     * app.json 属于小程序运行时需要读取的配置文件，必须要保证内容一致，所以目前这里只需要重新写一个类似 miniAppVistor 中的转换逻辑（miniAppVistor 中是完全覆写，这里是增量修改）
     */
    return Promise.resolve(traverseMergedXConfigToAppJson(map, waitedMergeProjectDirList))
        .then(function ({dist, content}) {
            return new Promise(function(res, rej) {
                if (!content) {
                    res(1);
                    return;
                }
                if (dist && content) {
                    console.log(`[mergeSourceFilesInOutput] 预计覆写文件: ${dist}`);
                    fs.ensureFileSync(dist);
                    fs.writeFile(dist, content, function(err: any) {
                        if (err) {
                            rej(err);
                        } else {
                            res(1);
                        }
                    });
                } else {
                    res(1);
                }
            })
        });
}
