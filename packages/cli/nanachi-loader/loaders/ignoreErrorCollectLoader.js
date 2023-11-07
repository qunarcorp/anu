module.exports = function (content, map, meta) {
    const lines = content.split('\n');
    const ignoreModulesPath = global.ignoreModulesPath;
    lines.forEach((line) => {
        if (line.indexOf('nanachi-ignore-dependency') > -1) {
            const match = line.match(/from\s+['"](.*)['"]/);
            if (match) {
                const modulePath = match[1];
                ignoreModulesPath[this.context] = ignoreModulesPath[this.context] || {};
                ignoreModulesPath[this.context][modulePath] = true;
            }
        }
    });
    return content;
};
