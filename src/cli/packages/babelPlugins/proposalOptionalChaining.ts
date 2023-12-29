import { types as t } from "@babel/core";

var _pluginSyntaxOptionalChaining = _interopRequireDefault(require('@babel/plugin-syntax-optional-chaining'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

export interface Options {
    loose?: boolean;
  }

module.exports = ((api, options: Options) => {
    api.assertVersion(7);
    const {
        loose = false
    } = options;
    return {
        name: 'proposal-optional-chaining',
        inherits: _pluginSyntaxOptionalChaining.default,
        visitor: {
            'OptionalCallExpression|OptionalMemberExpression'(path) {
                const {
                    parentPath,
                    scope
                } = path;
                const optionals = [];
                let optionalPath = path;

                while (optionalPath.isOptionalMemberExpression() || optionalPath.isOptionalCallExpression()) {
                    const {
                        node
                    } = optionalPath;

                    if (node.optional) {
                        optionals.push(node);
                    }

                    if (optionalPath.isOptionalMemberExpression()) {
                        optionalPath.node.type = 'MemberExpression';
                        optionalPath = optionalPath.get('object');
                    } else if (optionalPath.isOptionalCallExpression()) {
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

                    const isCall = t.isCallExpression(node);

                    const replaceKey = isCall ? 'callee' : 'object';
                    const chain = node[replaceKey];
                    let ref;
                    let check;

                    if (loose && isCall) {
                        check = ref = chain;
                    } else {
                        ref = scope.maybeGenerateMemoised(chain);
                
                        if (ref) {
                            // 移除关联关系
                            scope.removeBinding(ref.name);
                            check = t.assignmentExpression('=', t.cloneNode(ref), chain);
                            node[replaceKey] = ref;
                        } else {
                            check = ref = chain;
                        }
                    }

                    if (isCall && t.isMemberExpression(chain)) {
                        if (loose) {
                            node.callee = chain;
                        } else {
                            const {
                                object
                            } = chain;
                            let context = scope.maybeGenerateMemoised(object);

                            if (context) {
                                chain.object = t.assignmentExpression('=', context, object);
                            } else if (t.isSuper(object)) {
                                context = t.thisExpression();
                            } else {
                                context = object;
                            }

                            node.arguments.unshift(t.cloneNode(context));
                            node.callee = t.memberExpression(node.callee, t.identifier('call'));
                        }
                    }

                    replacementPath.replaceWith(t.conditionalExpression(loose ? t.binaryExpression('==', t.cloneNode(check), t.nullLiteral()) : t.logicalExpression('||', t.binaryExpression('===', t.cloneNode(check), t.nullLiteral()), t.binaryExpression('===', t.cloneNode(ref), scope.buildUndefinedNode())), scope.buildUndefinedNode(), replacementPath.node));
                    replacementPath = replacementPath.get('alternate');

                }
            }

        }
    };
});
