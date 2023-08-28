"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
/* eslint no-console: 0 */
/* eslint-disable*/
var execSync = require('child_process').execSync;
var t = require('@babel/types');
var path = require("path");
var fs = require("fs-extra");
var cwd = process.cwd();
var chalk = require('chalk');
var spawn = require('cross-spawn');
var nodeResolve = require('resolve');
var template = require('@babel/template')["default"];
var ora = require('ora');
var EventEmitter = require('events').EventEmitter;
var config = require('../../config/config');
var isWindow = require('./isWindow');
var isNpm = require('./isNpmModule');
var toUpperCamel = require('./toUpperCamel');
var shelljs = require('shelljs');
var Event = new EventEmitter();
var pkg;
try {
    pkg = require(path.join(cwd, 'package.json'));
}
catch (e) {
}
var userConfig = pkg && (pkg.nanachi || pkg.mpreact) || {};
var mergeWith = require('lodash.mergewith');
var crypto = require('crypto');
var cachedUsingComponents = {};
// 这里只处理多个平台会用的方法， 只处理某一个平台放到各自的helpers中
var utils = {
    on: function () {
        Event.on.apply(global, arguments);
    },
    emit: function () {
        Event.emit.apply(global, arguments);
    },
    spinner: function (text) {
        return ora(text);
    },
    getStyleValue: require('./calculateStyleString'),
    useYarn: function () {
        if (config['useYarn'] != undefined) {
            return config['useYarn'];
        }
        try {
            execSync('yarn --version', {
                stdio: 'ignore'
            });
            config['useYarn'] = true;
        }
        catch (e) {
            config['useYarn'] = false;
        }
        return config['useYarn'];
    },
    shortcutOfCreateElement: function () {
        return 'var h = React.createElement;';
    },
    //传入path.node, 得到标签名
    getNodeName: function (node) {
        var openTag = node.openingElement;
        return openTag && Object(openTag.name).name;
    },
    getEventName: function (eventName, nodeName, buildType) {
        if (eventName == 'Click' || eventName == 'Tap') {
            //如果是点击事件，PC端与快应用 使用quick
            if (buildType === 'quick' || buildType === 'h5') {
                return 'Click';
            }
            else {
                return 'Tap';
            }
        }
        if (buildType === 'quick' && nodeName === 'list') {
            if (eventName === 'ScrollToLower') {
                return 'ScrollBottom'; //快应用的list标签的事件
            }
            else if (eventName === 'ScrollToUpper') {
                return 'ScrollTop';
            }
        }
        if (buildType === 'ali' && nodeName === 'button') {
            if (eventName === 'GetUserInfo') {
                return 'GetAuthorize'; //支付宝下登录验证事件 https://docs.alipay.com/mini/component/button
            }
        }
        if (eventName === 'Change') {
            if (nodeName === 'input' || nodeName === 'textarea') {
                if (buildType !== 'quick') {
                    return 'Input';
                }
            }
        }
        return eventName;
    },
    createElement: function (nodeName, attrs, children) {
        return t.JSXElement(t.JSXOpeningElement(
        // [babel 6 to 7] The case has been changed: jsx and ts are now in lowercase.
        t.jsxIdentifier(nodeName), attrs, config.buildType === 'quick' ? false : !children.length), 
        // [babel 6 to 7] The case has been changed: jsx and ts are now in lowercase.
        t.jSXClosingElement(t.jsxIdentifier(nodeName)), children);
    },
    createNodeName: function (map, backup) {
        //这用于wxHelpers/nodeName.js, quickHelpers/nodeName.js
        return function (astPath, modules) {
            // 在回调函数中取patchNode，在外层取会比babel插件逻辑先执行，导致一直为{}
            var pagesNeedPatchComponents = config[config.buildType].patchPages || {};
            var orig = astPath.node.name.name;
            //组件名肯定大写开头
            if (/^[A-Z]/.test(orig)) {
                return orig;
            }
            var pagePath = modules.sourcePath;
            var currentPage = pagesNeedPatchComponents[pagePath];
            //schnee-ui补丁
            if (currentPage && currentPage[orig]) {
                var patchName = toUpperCamel('x-' + orig);
                return patchName;
            }
            return (astPath.node.name.name = map[orig] || backup);
        };
    },
    createAttribute: function (name, value) {
        return t.JSXAttribute(
        // [babel 6 to 7] The case has been changed: jsx and ts are now in lowercase.
        t.jsxIdentifier(name), typeof value == 'object' ? value : t.stringLiteral(value));
    },
    createUUID: function (astPath) {
        return astPath.node.start + astPath.node.end;
    },
    createDynamicAttributeValue: function (prefix, astPath, indexes) {
        var start = astPath.node.loc.start;
        var name = prefix + start.line + '_' + start.column;
        if (Array.isArray(indexes) && indexes.length) {
            var more = indexes.join("+'-'+");
            return t.jSXExpressionContainer(t.identifier("'" + name + "_'+" + more));
        }
        else {
            return name;
        }
    },
    genKey: function (key) {
        key = key + '';
        var keyPathAry = key.split('.');
        if (keyPathAry.length > 2) {
            // item.a.b =>  "{{a.b}}"
            key = '{{' + keyPathAry.slice(1).join('.') + '}}';
        }
        else {
            // item.a => "a"
            key = keyPathAry.slice(1).join('');
        }
        return keyPathAry.length > 1 ? key : '*this';
    },
    getAnu: function (state) {
        return state.file.opts.anu;
    },
    isLoopMap: function (astPath) {
        if (t.isJSXExpressionContainer(astPath.parentPath) ||
            t.isConditionalExpression(astPath.parentPath) ||
            t.isLogicalExpression(astPath.parentPath)) {
            var callee = astPath.node.callee;
            return (callee.type == 'MemberExpression' || callee.type == 'OptionalMemberExpression') && callee.property.name === 'map';
        }
    },
    createMethod: function (path, methodName) {
        //将类方法变成对象属性
        //https://babeljs.io/docs/en/babel-types#functionexpression
        return t.ObjectProperty(t.identifier(methodName), t.functionExpression(null, path.node.params, path.node.body, path.node.generator, path.node.async));
    },
    exportExpr: function (name, isDefault) {
        if (isDefault == true) {
            return template("module.exports.default = " + name + ";")();
        }
        else {
            return template("module.exports[\"" + name + "\"] = " + name + ";")();
        }
    },
    isNpm: isNpm,
    createRegisterStatement: function (className, path, isPage) {
        /**
         * placeholderPattern
         * Type: RegExp | false Default: /^[_$A-Z0-9]+$/
         *
         * A pattern to search for when looking for Identifier and StringLiteral nodes
         * that should be considered placeholders. 'false' will disable placeholder searching
         * entirely, leaving only the 'placeholderWhitelist' value to find placeholders.
         */
        var templateString = isPage ?
            'Page(React.registerPage(CLASSNAME,ASTPATH))' :
            'Component(React.registerComponent(CLASSNAME,ASTPATH))';
        return template(templateString)({
            CLASSNAME: t.identifier(className),
            ASTPATH: t.stringLiteral(path)
        });
    },
    installer: function (npmName, dev, needModuleEntryPath) {
        var isChaika = process.env.NANACHI_CHAIK_MODE === 'CHAIK_MODE';
        needModuleEntryPath = needModuleEntryPath || false;
        return new Promise(function (resolve) {
            var bin = '';
            var options = [];
            // if (this.useYarn()) {
            //     bin = 'yarn';
            //     options.push('add', npmName, dev === 'dev' ? '--dev' : '--save');
            // } else {
            //     bin = 'npm';
            //     options.push('install', npmName, dev === 'dev' ? '--save-dev' : '--save');
            // }
            bin = 'npm';
            var args = [
                'install',
            ];
            if (isChaika) {
                // chaika 模式下要安装到项目根目录node_modules
                args = args.concat(['--prefix', '../../']);
            }
            args = args.concat([
                npmName,
                dev === 'dev' ? '--save-dev' : '--save'
            ]);
            options.push.apply(options, args);
            // let result = spawn.sync(bin, options, {
            //     stdio: 'inherit'
            // });
            // if (result.error) {
            //     console.log(result.error);
            //     process.exit(1);
            // }
            console.log(chalk.green.bold("\uD83D\uDE9A \u6B63\u5728\u5B89\u88C5 " + npmName + ", \u8BF7\u7A0D\u540E..."));
            var cmd = __spreadArrays([bin], options);
            // https://github.com/npm/npm/issues/16794 npm 貌似有bug
            var std = shelljs.exec(cmd.join(' '), {
                silent: true
            });
            if (/npm ERR/.test(std.stderr)) {
                console.error(std.stderr);
                process.exit(0);
            }
            if (std.code !== 1) {
                console.log(chalk.green.bold("\u2714  \u5B89\u88C5 " + npmName + " \u6210\u529F."));
            }
            var npmPath = '';
            npmName = npmName.split('@')[0];
            if (needModuleEntryPath) {
                //获得自动安装的npm依赖模块路径
                npmPath = nodeResolve.sync(npmName, {
                    basedir: cwd,
                    moduleDirectory: path.join(cwd, 'node_modules'),
                    packageFilter: function (pkg) {
                        if (pkg.module) {
                            pkg.main = pkg.module;
                        }
                        return pkg;
                    }
                });
            }
            resolve(npmPath);
        });
    },
    getDistName: function (buildType) {
        return buildType === 'quick' ? 'src' : config.buildDir;
    },
    getDeps: function (messages) {
        if (messages === void 0) { messages = []; }
        return messages.filter(function (item) {
            return item.plugin === 'postcss-import' && item.type === 'dependency';
        });
    },
    getComponentOrAppOrPageReg: function () {
        return new RegExp(this.sepForRegex + '(?:pages|app|components)');
    },
    hasNpm: function (npmName) {
        var flag = false;
        try {
            nodeResolve.sync(npmName, {
                moduleDirectory: path.join(cwd, 'node_modules')
            });
            flag = true;
        }
        catch (err) {
            // eslint-disable-next-line
        }
        return flag;
    },
    decodeChinise: require('./decodeChinese'),
    isWebView: function (fileId) {
        if (config.buildType != 'quick') {
            return false;
        }
        var rules = config.WebViewRules && config.WebViewRules.pages || [];
        if (!rules.length) {
            return false;
        }
        var isWebView = rules.includes(fileId) ||
            rules.some(function (rule) {
                //如果是webview设置成true, 则用增则匹配
                return Object.prototype.toString.call(rule) === '[object RegExp]' && rule.test(fileId);
            });
        return isWebView;
    },
    parseCamel: toUpperCamel,
    uniquefilter: function (arr, key) {
        if (key === void 0) { key = ''; }
        var map = {};
        return arr.filter(function (item) {
            if (!item[key]) {
                return true;
            }
            if (!map[item[key]]) {
                map[item[key]] = 1;
                return true;
            }
            return false;
        });
    },
    isWin: function () {
        return isWindow;
    },
    sepForRegex: isWindow ? "\\" + path.win32.sep : path.sep,
    fixWinPath: function (p) {
        return p.replace(/\\/g, '/');
    },
    isMportalEnv: function () {
        var envs = ['prod', 'rc', 'beta'];
        return envs.includes((process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase()));
    },
    cleanLog: function (log) {
        // 清理eslint stylelint错误日志内容
        var reg = /[\s\S]*Module (Error|Warning)\s*\(.*?(es|style)lint.*?\):\n+/gm;
        if (reg.test(log)) {
            return log.replace(/^\s*@[\s\S]*$/gm, '').replace(reg, '');
        }
        return log;
    },
    validatePlatform: function (platform, platforms) {
        return platforms.some(function (p) {
            return p.buildType === platform;
        });
    },
    customizer: function (objValue, srcValue) {
        if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    },
    deepMerge: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return mergeWith.apply(void 0, __spreadArrays(args, [utils.customizer]));
    },
    getStyleNamespace: function (dirname) {
        var s = crypto.createHash('md5');
        s.update(dirname);
        return "anu-style-" + s.digest('hex').substr(0, 6);
    },
    /**
     * 检测配置文件是否存在
     * @param configFile 配置文件名
     */
    isCheckQuickConfigFileExist: function (configFile) {
        var configFileDist = path.join(cwd, 'source', configFile);
        try {
            fs.accessSync(configFileDist);
            return true;
        }
        catch (err) {
            return false;
        }
    },
    getProjectRootPath: function () {
        // /a/project
        // /a/project/.CACHE/nanachi
        // /a/project/.CACHE/nanachi/wx
        return cwd.split('\/.CACHE')[0];
    },
    getDistDir: function () {
        var projectRootPath = this.getProjectRootPath();
        return path.join(projectRootPath, this.getDistRelativeDir());
    },
    /**
     * 获取sourceMap的绝对地址
     * @returns
     */
    getDisSourceMapDir: function () {
        var projectRootPath = this.getProjectRootPath();
        return path.join(projectRootPath, 'sourcemap', config.buildType);
    },
    getDistRelativeDir: function () {
        var isMultiple = userConfig.multiple || false;
        if (config.buildType === 'quick') {
            return 'src';
        }
        return path.join(
        // 快应用把dist, build目录占了。
        // 在同时构建多个小程序的时候，非快应用的构建到target目录里
        isMultiple ? 'target' : config.buildDir, isMultiple ? config.buildType : '');
    },
    getDistPathFromSoucePath: function (sourcePath) {
        if (/\/node_modules\//.test(sourcePath)) {
            return path.join(this.getDistDir(), 'npm', sourcePath.split('/node_modules/').pop());
        }
        var fileName = sourcePath.split('/source/').pop();
        return path.join(this.getDistDir(), fileName);
    }
};
module.exports = utils;
exports["default"] = utils;
