"use strict";
exports.__esModule = true;
//分包配置
var buildType = process.env.ANU_ENV;
var supportPlat = ['wx', 'bu', 'qq', 'ali'];
var keys = {
    ali: 'subPackages',
    bu: 'subPackages',
    wx: 'subpackages',
    qq: 'subpackages'
};
var getSubpackage = require('./getSubPackage');
module.exports = function (modules, json) {
    if (modules.componentType !== 'App') {
        return json;
    }
    if (!supportPlat.includes(buildType)) {
        return json;
    }
    if (!json.pages)
        return json;
    json[keys[buildType]] = json[keys[buildType]] || [];
    var subPackages = getSubpackage(buildType);
    var routes = json.pages.slice();
    subPackages.forEach(function (el) {
        var name = el.name, resource = el.resource;
        /**
         * subPackagesItem: [
         *     root: "pages/demo/native",
         *     name: "native",
         *     pages: ["await/index", "loop/index"]
         * ]
         */
        var subPackagesItem = {
            root: resource,
            name: name,
            pages: []
        };
        if (buildType === 'ali') {
            delete subPackagesItem.name;
        }
        //核心是根据配置中的 resource 创建正则，去遍历出 pages 中的的匹配这个正则的路由。
        var reg = new RegExp('^' + resource + '$');
        json[keys[buildType]].push(subPackagesItem);
        json.pages.forEach(function (pageRoute) {
            // pages/platform/citySelect/index -> pages/platform
            var pageDirName = pageRoute.split('/').slice(0, 2).join('/');
            if (reg.test(pageDirName)) {
                var _index = routes.indexOf(pageRoute);
                //如果匹配到分包，需要从 pages 中将分包的路径删除掉
                var subPage = routes.splice(_index, 1)[0];
                // pages/demo/syntax/multiple/index => multiple/index
                subPackagesItem.pages.push(subPage.replace(resource + '/', ''));
            }
        });
    });
    if (!json[keys[buildType]].length) {
        delete json[keys[buildType]];
    }
    // 去重，防止主包和公共包重命名后路由出现多份的情况。
    var set = new Set();
    routes.forEach(function (route) { return set.add(route); });
    var pages = Array.from(set);
    json.pages = pages;
    return json;
};
