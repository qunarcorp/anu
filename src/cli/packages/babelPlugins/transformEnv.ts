
import config from '../../config/config';
let defaultConfig = [
    [
        //配置环境变量
        require('babel-plugin-transform-inline-environment-variables'),
        {
            env: {
                ANU_ENV: config['buildType'],
                ANU_WEBVIEW: process.env.ANU_WEBVIEW,  //在快应用 createRouter 中用
                BUILD_ENV: process.env.BUILD_ENV,
            }
        }
    ],
    // 移除没用的代码 下方代码和@babel/plugin-proposal-object-rest-spread有冲突，导致报错，而且官方不维护了，所以删除
    // [require('babel-plugin-minify-dead-code-elimination'), {
    //     // 可能是插件bug，会删除一些已使用参数，所以开启keepFnArgs【防止插件删除函数参数】
    //     keepFnArgs: true
    // }]
    // 移除无用的代码，根据官方代码改编
    [require('./transformDeadCode'), {keepFnArgs: true}]
]


// [ '/usr/local/bin/node', '/usr/local/bin/nanachi', 'build:ali' ]
if (
    /^(build)/.test(process.argv[2])
    && ['prod', 'production'].includes(process.env.BUILD_ENV)
) {
    defaultConfig.push([require('babel-plugin-transform-remove-console'), { 'exclude': ['error', 'warn'] }]);
}

module.exports = defaultConfig;