"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@babel/core");
var _pluginSyntaxOptionalChaining = _interopRequireDefault(require('@babel/plugin-syntax-optional-chaining'));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
module.exports = ((api, options) => {
    api.assertVersion(7);
    const { loose = false } = options;
    return {
        name: 'proposal-optional-chaining',
        inherits: _pluginSyntaxOptionalChaining.default,
        visitor: {
            'OptionalCallExpression|OptionalMemberExpression'(path) {
                const { parentPath, scope } = path;
                const optionals = [];
                let optionalPath = path;
                while (optionalPath.isOptionalMemberExpression() || optionalPath.isOptionalCallExpression()) {
                    const { node } = optionalPath;
                    if (node.optional) {
                        optionals.push(node);
                    }
                    if (optionalPath.isOptionalMemberExpression()) {
                        optionalPath.node.type = 'MemberExpression';
                        optionalPath = optionalPath.get('object');
                    }
                    else if (optionalPath.isOptionalCallExpression()) {
                        optionalPath.node.type = 'CallExpression';
                        optionalPath = optionalPath.get('callee');
                    }
                }
                let replacementPath = path;
                if (parentPath.isUnaryExpression({
                    operator: 'delete'
                })) {
                    replacementPath = parentPath;
                }
                for (let i = optionals.length - 1; i >= 0; i--) {
                    const node = optionals[i];
                    const isCall = core_1.types.isCallExpression(node);
                    const replaceKey = isCall ? 'callee' : 'object';
                    const chain = node[replaceKey];
                    let ref;
                    let check;
                    if (loose && isCall) {
                        check = ref = chain;
                    }
                    else {
                        ref = scope.maybeGenerateMemoised(chain);
                        if (ref) {
                            scope.removeBinding(ref.name);
                            check = core_1.types.assignmentExpression('=', core_1.types.cloneNode(ref), chain);
                            node[replaceKey] = ref;
                        }
                        else {
                            check = ref = chain;
                        }
                    }
                    if (isCall && core_1.types.isMemberExpression(chain)) {
                        if (loose) {
                            node.callee = chain;
                        }
                        else {
                            const { object } = chain;
                            let context = scope.maybeGenerateMemoised(object);
                            if (context) {
                                scope.removeBinding(context.name);
                                chain.object = core_1.types.assignmentExpression('=', context, object);
                            }
                            else if (core_1.types.isSuper(object)) {
                                context = core_1.types.thisExpression();
                            }
                            else {
                                context = object;
                            }
                            node.arguments.unshift(core_1.types.cloneNode(context));
                            node.callee = core_1.types.memberExpression(node.callee, core_1.types.identifier('call'));
                        }
                    }
                    replacementPath.replaceWith(core_1.types.conditionalExpression(loose ? core_1.types.binaryExpression('==', core_1.types.cloneNode(check), core_1.types.nullLiteral()) : core_1.types.logicalExpression('||', core_1.types.binaryExpression('===', core_1.types.cloneNode(check), core_1.types.nullLiteral()), core_1.types.binaryExpression('===', core_1.types.cloneNode(ref), scope.buildUndefinedNode())), scope.buildUndefinedNode(), replacementPath.node));
                    replacementPath = replacementPath.get('alternate');
                }
            }
        }
    };
});
