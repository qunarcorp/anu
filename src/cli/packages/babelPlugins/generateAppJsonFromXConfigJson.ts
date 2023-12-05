const ignoreAppJsonProp = ['window', 'tabBar', 'pages', 'subpackages', 'preloadRule'];

// 搜寻 Xconfig.json 直接对 json 对象进行修改
module.exports = function(xConfigJson, json) {
    Object.keys(xConfigJson).forEach((key) => {
        if (!ignoreAppJsonProp.includes(key.toLowerCase())) {
            json[key] = xConfigJson[key];
        }
    });
};
