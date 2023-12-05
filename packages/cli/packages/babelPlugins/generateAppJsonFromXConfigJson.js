const ignoreAppJsonProp = ['window', 'tabBar', 'pages', 'subpackages', 'preloadRule'];
module.exports = function (xConfigJson, json) {
    Object.keys(xConfigJson).forEach((key) => {
        if (!ignoreAppJsonProp.includes(key.toLowerCase())) {
            json[key] = xConfigJson[key];
        }
    });
};
