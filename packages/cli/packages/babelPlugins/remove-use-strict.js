module.exports = removeUseStrict;
const newIssueUrl = "https://github.com/babel/minify/issues/new";
const useStrict = "use strict";
function removeUseStrict(block) {
    if (!block.isBlockStatement()) {
        throw new Error(`Received ${block.type}. Expected BlockStatement. ` +
            `Please report at ${newIssueUrl}`);
    }
    const useStricts = getUseStrictDirectives(block);
    if (useStricts.length < 1)
        return;
    if (useStricts.length > 1) {
        for (let i = 1; i < useStricts.length; i++) {
            useStricts[i].remove();
        }
    }
    if (hasStrictParent(block)) {
        useStricts[0].remove();
    }
}
function hasStrictParent(path) {
    return path.findParent(parent => parent.isBlockStatement() && isStrict(parent));
}
function isStrict(block) {
    return getUseStrictDirectives(block).length > 0;
}
function getUseStrictDirectives(block) {
    var dir = block.get("directives");
    return Array.isArray(dir)
        ? dir.filter(function (directive) {
            return directive.node.value.value === useStrict;
        })
        : [];
}
