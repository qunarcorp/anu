import { NanachiOptions } from '../index';
import webpack from 'webpack-new';
export default function ({ watch, platform, compress, compressOption, plugins, rules, huawei, analysis, typescript, prevLoaders, postLoaders, prevJsLoaders, postJsLoaders, prevCssLoaders, postCssLoaders, }: NanachiOptions): webpack.Configuration;
