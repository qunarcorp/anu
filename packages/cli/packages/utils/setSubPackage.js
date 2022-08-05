"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buildType = process.env.ANU_ENV;
const supportPlat = ['wx', 'bu', 'qq', 'ali', 'tt'];
const keys = {
    ali: 'subPackages',
    bu: 'subPackages',
    wx: 'subpackages',
    qq: 'subpackages',
    tt: 'subpackages'
};
const getSubpackage = require('./getSubPackage');
module.exports = function (modules, json) {
    if (modules.componentType !== 'App') {
        return json;
    }
    if (!supportPlat.includes(buildType)) {
        return json;
    }
    if (!json.pages)
        return json;
    let set = new Set();
    json.pages.forEach((route) => set.add(route));
    json.pages = Array.from(set);
    json[keys[buildType]] = json[keys[buildType]] || [];
    const subPackages = getSubpackage(buildType);
    let routes = json.pages.slice();
    subPackages.forEach(function (el) {
        let { name, resource } = el;
        let subPackagesItem = {
            root: resource,
            name: name,
            pages: []
        };
        if (buildType === 'ali') {
            delete subPackagesItem.name;
        }
        let reg = new RegExp('^' + resource + '$');
        json[keys[buildType]].push(subPackagesItem);
        json.pages.forEach(function (pageRoute) {
            const pageDirName = pageRoute.split('/').slice(0, 2).join('/');
            if (reg.test(pageDirName)) {
                let _index = routes.indexOf(pageRoute);
                let subPage = routes.splice(_index, 1)[0];
                subPackagesItem.pages.push(subPage.replace(resource + '/', ''));
            }
        });
    });
    if (!json[keys[buildType]].length) {
        delete json[keys[buildType]];
    }
    json.pages = routes;
    return json;
};
