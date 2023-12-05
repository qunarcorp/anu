const supportPlat = ['wx', 'bu', 'qq', 'ali', 'tt'];
const keys = {
    ali: 'subPackages',
    bu: 'subPackages',
    wx: 'subpackages',
    qq: 'subpackages',
    tt: 'subpackages'
};
const getSubpackage = require('./getSubPackage');
const path = require('path');
const utils = require('./index');
const setSubPackageWithModuleJudge = (modules, json) => {
    if (modules.componentType !== 'App') {
        return json;
    }
    if (!supportPlat.includes(process.env.ANU_ENV)) {
        return json;
    }
    return setSubPackage(json);
};
const setSubPackage = (json, XConfigJson) => {
    if (!json.pages)
        return json;
    let set = new Set();
    json.pages.forEach((route) => set.add(route));
    json.pages = Array.from(set);
    json[keys[process.env.ANU_ENV]] = json[keys[process.env.ANU_ENV]] || [];
    let subPackages;
    if (XConfigJson) {
        subPackages = getSubpackage(process.env.ANU_ENV, XConfigJson);
    }
    else {
        subPackages = getSubpackage(process.env.ANU_ENV);
    }
    let routes = json.pages.slice();
    subPackages.forEach(function (el) {
        let { name, resource } = el;
        let subPackagesItem = {
            root: resource,
            name: name,
            pages: []
        };
        if (process.env.ANU_ENV === 'ali') {
            delete subPackagesItem.name;
        }
        let reg = new RegExp('^' + resource + '$');
        if (json[keys[process.env.ANU_ENV]].find((el) => el.root === resource && el.pages && el.pages.length)) {
        }
        else {
            json[keys[process.env.ANU_ENV]].push(subPackagesItem);
        }
        json.pages.forEach(function (pageRoute) {
            const pageDirName = pageRoute.split('/').slice(0, 2).join('/');
            if (reg.test(pageDirName)) {
                let _index = routes.indexOf(pageRoute);
                let subPage = routes.splice(_index, 1)[0];
                subPackagesItem.pages.push(subPage.replace(resource + '/', ''));
            }
        });
    });
    if (!json[keys[process.env.ANU_ENV]].length) {
        delete json[keys[process.env.ANU_ENV]];
    }
    json.pages = routes;
    return json;
};
module.exports = {
    setSubPackageWithModuleJudge,
    setSubPackage
};
