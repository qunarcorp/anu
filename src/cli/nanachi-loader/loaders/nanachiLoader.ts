import JavascriptParserFactory from '../../parsers/jsParser/JavascriptParserFactory';
import utils from '../../packages/utils/index';
import { error, setError } from '../../packages/utils/logger/queue';

export interface NanachiQueue {
    code: string;
    path: string;
    type: string;
    ast?: any;
    fileMap?: any;
    extraModules?: Array<string>
}

export interface NanachiLoaderStruct {
    queues: Array<NanachiQueue>;
    exportCode: string;
}

module.exports = async function(code: string, map: any, meta: any) {
    const callback = this.async();
    try {
        const parser = JavascriptParserFactory.create({
            platform: this.nanachiOptions.platform,
            filepath: this.resourcePath,
            code,
            map,
            meta
        });

        try {

            // error队列清空本页错误
            const newError = error.filter(v => v.id !== this.resourcePath);
            setError(newError);

            await parser.parse();
        } catch (err) {
            //生产环境中构建时候如果构建错误，立马退出，抛错。
            if ( utils.isMportalEnv() ) {
                console.log(err);
                process.exit(1);
            }
            error.push({
                id: this.resourcePath,
                msg: err
            });
        }

        let result = {
            queues: parser.getExtraFiles(),
            exportCode: parser.getExportCode()
        };
        callback(null, result, map, meta);
        return;
    } catch (e) {
        callback(e, { queues: [], exportCode: '' }, map, meta);
        return;
    }
};
