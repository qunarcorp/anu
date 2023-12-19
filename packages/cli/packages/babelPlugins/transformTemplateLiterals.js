"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
module.exports = ((api, options) => {
    var _a, _b;
    const ignoreToPrimitiveHint = (_a = api.assumption("ignoreToPrimitiveHint")) !== null && _a !== void 0 ? _a : options.loose;
    const mutableTemplateObject = (_b = api.assumption("mutableTemplateObject")) !== null && _b !== void 0 ? _b : options.loose;
    let helperName = "taggedTemplateLiteral";
    if (mutableTemplateObject)
        helperName += "Loose";
    function buildConcatCallExpressions(items) {
        let avail = true;
        return items.reduce(function (left, right) {
            let canBeInserted = core_1.types.isLiteral(right);
            if (!canBeInserted && avail) {
                canBeInserted = true;
                avail = false;
            }
            if (canBeInserted && core_1.types.isCallExpression(left)) {
                left.arguments.push(right);
                return left;
            }
            return core_1.types.callExpression(core_1.types.memberExpression(left, core_1.types.identifier("concat")), [right]);
        });
    }
    return {
        name: "transform-template-literals",
        visitor: {
            TaggedTemplateExpression(path) {
                const { node } = path;
                const { quasi } = node;
                const strings = [];
                const raws = [];
                let isStringsRawEqual = true;
                for (const elem of quasi.quasis) {
                    const { raw, cooked } = elem.value;
                    const value = cooked == null
                        ? path.scope.buildUndefinedNode()
                        : core_1.types.stringLiteral(cooked);
                    strings.push(value);
                    raws.push(core_1.types.stringLiteral(raw));
                    if (raw !== cooked) {
                        isStringsRawEqual = false;
                    }
                }
                const helperArgs = [core_1.types.arrayExpression(strings)];
                if (!isStringsRawEqual) {
                    helperArgs.push(core_1.types.arrayExpression(raws));
                }
                const tmp = path.scope.generateUidIdentifier("templateObject");
                path.scope.getProgramParent().push({ id: core_1.types.cloneNode(tmp) });
                path.replaceWith(core_1.types.callExpression(node.tag, [
                    core_1.template.expression.ast `
              ${core_1.types.cloneNode(tmp)} || (
                ${tmp} = ${this.addHelper(helperName)}(${helperArgs})
              )
            `,
                    ...quasi.expressions,
                ]));
            },
            TemplateLiteral(path) {
                if (path.parent.type === "TSLiteralType") {
                    return;
                }
                const nodes = [];
                const expressions = path.get("expressions");
                let index = 0;
                for (const elem of path.node.quasis) {
                    if (elem.value.cooked) {
                        nodes.push(core_1.types.stringLiteral(elem.value.cooked));
                    }
                    if (index < expressions.length) {
                        const expr = expressions[index++];
                        const node = expr.node;
                        if (!core_1.types.isStringLiteral(node, { value: "" })) {
                            nodes.push(node);
                            node.name ? path.scope.removeBinding(node.name) : null;
                        }
                    }
                }
                if (!core_1.types.isStringLiteral(nodes[0]) &&
                    !(ignoreToPrimitiveHint && core_1.types.isStringLiteral(nodes[1]))) {
                    nodes.unshift(core_1.types.stringLiteral(""));
                }
                let root = nodes[0];
                if (ignoreToPrimitiveHint) {
                    for (let i = 1; i < nodes.length; i++) {
                        root = core_1.types.binaryExpression("+", root, nodes[i]);
                    }
                }
                else if (nodes.length > 1) {
                    root = buildConcatCallExpressions(nodes);
                }
                path.replaceWith(root);
            },
        },
    };
});
