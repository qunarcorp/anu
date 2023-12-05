//分包配置
const supportPlat: any = ['wx', 'bu', 'qq', 'ali', 'tt'];
const keys: {
    [props: string]: string;
} = {
    ali: 'subPackages',
    bu: 'subPackages',
    wx: 'subpackages',
    qq: 'subpackages',
    tt: 'subpackages'
};
const getSubpackage = require('./getSubPackage');
const path = require('path');
const utils = require('./index');

// 这个是旧版在 miniappVistor 中的逻辑，调用时需要传入 modele 进行判断
const setSubPackageWithModuleJudge = (modules: any, json: any) => {
    if (modules.componentType !== 'App') {
        return json;
    }
    if (!supportPlat.includes(process.env.ANU_ENV)) {
        return json;
    }

    return setSubPackage(json);
};

// 不需要传入 module 进行判断 (因为可能没有)
const setSubPackage = (json: any,  XConfigJson ?: any) => {
    if (!json.pages) return json;

    // 去重，防止主包和公共包重命名后路由出现多份的情况。
    let set = new Set();
    json.pages.forEach((route: string) => set.add(route));
    json.pages = Array.from(set);

    /* json.pages
    [
        'pages/platform/indexWx/index',
          'pages/alonePlatform/subscribePage/index',
          'pages/platform/login/index',
          'pages/orderList/orderList/index',
    ]
    */

    json[keys[process.env.ANU_ENV]] = json[keys[process.env.ANU_ENV]] || [];
    let subPackages;
    if (XConfigJson) {
        subPackages = getSubpackage(process.env.ANU_ENV, XConfigJson);
    } else { // 旧逻辑通过 process.env.ANU_ENV 查找
        subPackages = getSubpackage(process.env.ANU_ENV);
    }

    let routes = json.pages.slice();
    /*
    "subpackages": [
        {
            "name": "debugger",
            "resource": "pages/debugger"
        },
        {
            "name": "flightWeb",
            "resource": "flight/pages"
        },
        ......
    ],
     */
    subPackages.forEach(function (el: any) {
        let { name, resource } = el;
        /**
         * subPackagesItem: [
         *     root: "pages/demo/native",
         *     name: "native",
         *     pages: ["await/index", "loop/index"]
         * ]
         */
        let subPackagesItem: any = {
            root: resource,
            name: name,
            pages: []
        };

        if (process.env.ANU_ENV === 'ali') {
            delete subPackagesItem.name;
        }

        // 核心是根据配置中的 resource 创建正则，去遍历出 pages 中的的匹配这个正则的路由。
        let reg = new RegExp('^' + resource + '$');

        // 根据 resource 查找 json[keys[process.env.ANU_ENV]] 是否存在同样的元素，且上边的 pages 数组是否长度不为 0 判断
        // 如果满足，则认为不是本次需要增加的 subPackagesItem，直接跳过 push，只删去冗余的 pages
        // 例如在 mergeSourceFilesInOutput 中调用时，就会出现 json 上包含一部分已经完成了 subpackages 元素，目的就是跳过这些元素
        if (json[keys[process.env.ANU_ENV]].find((el: any) => el.root === resource && el.pages && el.pages.length)) {
            // do noting
        } else {
            json[keys[process.env.ANU_ENV]].push(subPackagesItem);
        }

        json.pages.forEach(function (pageRoute: string) {
            // pages/platform/citySelect/index -> pages/platform
            const pageDirName = pageRoute.split('/').slice(0, 2).join('/');
            if (reg.test(pageDirName)) {
                let _index = routes.indexOf(pageRoute);

                //如果匹配到分包，需要从 pages 中将分包的路径删除掉
                let subPage = routes.splice(_index, 1)[0];

                // pages/demo/syntax/multiple/index => multiple/index
                // 如果前边跳过 push，此处 push 是无效的
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
