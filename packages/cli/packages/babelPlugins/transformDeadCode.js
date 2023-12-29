const some = require('lodash/some');
const { markEvalScopes, hasEval } = require('babel-helper-mark-eval-scopes');
const removeUseStrict = require('./remove-use-strict');
const evaluate = require('babel-helper-evaluate-path');
function evaluateTruthy(path) {
    const res = evaluate(path);
    if (res.confident)
        return !!res.value;
}
function prevSiblings(path) {
    const parentPath = path.parentPath;
    const siblings = [];
    let key = parentPath.key;
    while ((path = parentPath.getSibling(--key)).type) {
        siblings.push(path);
    }
    return siblings;
}
function forEachAncestor(path, callback) {
    while ((path = path.parentPath)) {
        callback(path);
    }
}
module.exports = ({ types: t, traverse }) => {
    const removeOrVoid = require('babel-helper-remove-or-void')(t);
    const shouldRevisit = Symbol('shouldRevisit');
    const markForRemoval = Symbol('markForRemoval');
    const main = {
        ExpressionStatement(path) {
            if (path.get('expression').isPure()) {
                removeOrVoid(path);
            }
        },
        Function: {
            exit(path) {
                if (!this.optimizeRawSize) {
                    return;
                }
                const { node, scope } = path;
                const seen = new Set();
                const declars = [];
                const mutations = [];
                for (const name in scope.bindings) {
                    const binding = scope.bindings[name];
                    if (!binding.path.isVariableDeclarator()) {
                        continue;
                    }
                    const declarPath = binding.path.parentPath;
                    if (seen.has(declarPath)) {
                        continue;
                    }
                    seen.add(declarPath);
                    if (declarPath.parentPath.isForInStatement()) {
                        continue;
                    }
                    if (declarPath.parentPath.parentPath.isFunction()) {
                        continue;
                    }
                    if (!declarPath.node || !declarPath.node.declarations) {
                        continue;
                    }
                    const assignmentSequence = [];
                    for (const declar of declarPath.node.declarations) {
                        declars.push(declar);
                        if (declar.init) {
                            assignmentSequence.push(t.assignmentExpression('=', declar.id, declar.init));
                            mutations.push(() => {
                                declar.init = null;
                            });
                        }
                    }
                    if (assignmentSequence.length) {
                        mutations.push(() => declarPath.replaceWith(t.sequenceExpression(assignmentSequence)));
                    }
                    else {
                        mutations.push(() => removeOrVoid(declarPath));
                    }
                }
                if (declars.length) {
                    mutations.forEach(f => f());
                    for (const statement of node.body.body) {
                        if (t.isVariableDeclaration(statement)) {
                            statement.declarations.push(...declars);
                            return;
                        }
                    }
                    const varDecl = t.variableDeclaration('var', declars);
                    node.body.body.unshift(varDecl);
                }
            }
        },
        Scope: {
            exit(path) {
                if (path.node[shouldRevisit]) {
                    delete path.node[shouldRevisit];
                    path.visit();
                }
            },
            enter(path) {
                if (path.isProgram()) {
                    return;
                }
                if (hasEval(path.scope)) {
                    return;
                }
                const { scope } = path;
                const canRemoveParams = path.isFunction() && path.node.kind !== 'set';
                const paramsList = canRemoveParams ? path.get('params') : [];
                for (let i = paramsList.length - 1; i >= 0; i--) {
                    const param = paramsList[i];
                    if (param.isIdentifier()) {
                        const binding = scope.bindings[param.node.name];
                        if (!binding)
                            continue;
                        if (binding.referenced) {
                            break;
                        }
                        binding[markForRemoval] = true;
                        continue;
                    }
                    else if (param.isAssignmentPattern()) {
                        const left = param.get('left');
                        const right = param.get('right');
                        if (left.isIdentifier() && right.isPure()) {
                            const binding = scope.bindings[left.node.name];
                            if (binding.referenced) {
                                break;
                            }
                            binding[markForRemoval] = true;
                            continue;
                        }
                    }
                    break;
                }
                for (const name in scope.bindings) {
                    const binding = scope.bindings[name];
                    if (!binding.referenced && binding.kind !== 'module') {
                        if (binding.kind === 'param' &&
                            (this.keepFnArgs || !binding[markForRemoval])) {
                            continue;
                        }
                        else if (binding.path.isVariableDeclarator()) {
                            const declaration = binding.path.parentPath;
                            const maybeBlockParent = declaration.parentPath;
                            if (maybeBlockParent &&
                                maybeBlockParent.isForXStatement({
                                    left: declaration.node
                                })) {
                                continue;
                            }
                        }
                        else if (!scope.isPure(binding.path.node)) {
                            continue;
                        }
                        else if (binding.path.isFunctionExpression() ||
                            binding.path.isClassExpression()) {
                            continue;
                        }
                        else if (binding.path.isClassDeclaration() &&
                            binding.path === scope.path) {
                            continue;
                        }
                        const mutations = [];
                        let bail = false;
                        binding.constantViolations.forEach(p => {
                            if (bail || p === binding.path) {
                                return;
                            }
                            if (!p.parentPath.isExpressionStatement()) {
                                bail = true;
                            }
                            if (p.isAssignmentExpression()) {
                                if (t.isArrayPattern(p.node.left) ||
                                    t.isObjectPattern(p.node.left)) {
                                    bail = true;
                                }
                                else if (p.get('right').isPure()) {
                                    mutations.push(() => removeOrVoid(p));
                                }
                                else {
                                    mutations.push(() => p.replaceWith(p.get('right')));
                                }
                            }
                        });
                        if (bail) {
                            continue;
                        }
                        if (binding.path.isVariableDeclarator()) {
                            if (!binding.path.get('id').isIdentifier()) {
                                continue;
                            }
                            if (binding.path.node.init &&
                                !scope.isPure(binding.path.node.init) &&
                                binding.path.parentPath.node.declarations) {
                                if (binding.path.parentPath.node.declarations.length !== 1) {
                                    continue;
                                }
                                binding.path.parentPath.replaceWith(binding.path.node.init);
                            }
                            else {
                                updateReferences(binding.path, this);
                                removeOrVoid(binding.path);
                            }
                        }
                        else {
                            updateReferences(binding.path, this);
                            removeOrVoid(binding.path);
                        }
                        mutations.forEach(f => f());
                        scope.removeBinding(name);
                    }
                    else if (binding.constant) {
                        if (binding.path.isFunctionDeclaration() ||
                            (binding.path.isVariableDeclarator() &&
                                binding.path.get('init').isFunction())) {
                            const fun = binding.path.isFunctionDeclaration()
                                ? binding.path
                                : binding.path.get('init');
                            let allInside = true;
                            for (const ref of binding.referencePaths) {
                                if (!ref.find(p => p.node === fun.node)) {
                                    allInside = false;
                                    break;
                                }
                            }
                            if (allInside) {
                                scope.removeBinding(name);
                                updateReferences(binding.path, this);
                                removeOrVoid(binding.path);
                                continue;
                            }
                        }
                        if (binding.references === 1 &&
                            binding.kind !== 'param' &&
                            binding.kind !== 'module' &&
                            binding.constant) {
                            let replacement = binding.path.node;
                            let replacementPath = binding.path;
                            let isReferencedBefore = false;
                            const refPath = binding.referencePaths[0];
                            if (t.isVariableDeclarator(replacement)) {
                                const _prevSiblings = prevSiblings(replacementPath);
                                forEachAncestor(refPath, ancestor => {
                                    if (_prevSiblings.indexOf(ancestor) > -1) {
                                        isReferencedBefore = true;
                                    }
                                });
                                if (isReferencedBefore && refPath.scope !== binding.scope) {
                                    continue;
                                }
                                replacement = isReferencedBefore
                                    ? t.unaryExpression('void', t.numericLiteral(0), true)
                                    : replacement.init;
                                if (!replacementPath.get('id').isIdentifier()) {
                                    continue;
                                }
                                replacementPath = replacementPath.get('init');
                            }
                            if (!replacement) {
                                continue;
                            }
                            if (!scope.isPure(replacement, true) && !isReferencedBefore) {
                                continue;
                            }
                            let bail = false;
                            if (replacementPath.isIdentifier()) {
                                const binding = scope.getBinding(replacement.name);
                                bail = !(binding &&
                                    refPath.scope.getBinding(replacement.name) === binding &&
                                    binding.constantViolations.length === 0);
                            }
                            else if (replacementPath.isThisExpression()) {
                                bail = true;
                            }
                            else {
                                replacementPath.traverse({
                                    Function(path) {
                                        path.skip();
                                    },
                                    ThisExpression(path) {
                                        bail = true;
                                        path.stop();
                                    },
                                    ReferencedIdentifier({ node }) {
                                        const binding = scope.getBinding(node.name);
                                        if (binding &&
                                            refPath.scope.getBinding(node.name) === binding) {
                                            bail = binding.constantViolations.length > 0;
                                            if (bail) {
                                                path.stop();
                                            }
                                        }
                                    }
                                });
                            }
                            if (bail) {
                                continue;
                            }
                            let parent = binding.path.parent;
                            if (t.isVariableDeclaration(parent)) {
                                parent = binding.path.parentPath.parent;
                            }
                            let mayLoop = false;
                            const sharesRoot = refPath.find(({ node }) => {
                                if (!mayLoop) {
                                    mayLoop =
                                        t.isWhileStatement(node) ||
                                            t.isFor(node) ||
                                            t.isFunction(node);
                                }
                                return node === parent;
                            });
                            const isObj = n => t.isFunction(n) ||
                                t.isObjectExpression(n) ||
                                t.isArrayExpression(n) ||
                                t.isRegExpLiteral(n);
                            const isReplacementObj = isObj(replacement) || some(replacement, isObj);
                            if (!sharesRoot || (isReplacementObj && mayLoop)) {
                                continue;
                            }
                            let inExpression = replacementPath.isBinaryExpression({
                                operator: 'in'
                            });
                            if (!inExpression) {
                                replacementPath.traverse({
                                    Function(path) {
                                        path.skip();
                                    },
                                    BinaryExpression(path) {
                                        if (path.node.operator === 'in') {
                                            inExpression = true;
                                            path.stop();
                                        }
                                    }
                                });
                            }
                            if (inExpression) {
                                continue;
                            }
                            const replaced = replace(binding.referencePaths[0], {
                                binding,
                                scope,
                                replacement,
                                replacementPath
                            });
                            if (replaced) {
                                scope.removeBinding(name);
                                if (binding.path.node) {
                                    removeOrVoid(binding.path);
                                }
                            }
                        }
                    }
                }
            }
        },
        BlockStatement(path) {
            const paths = path.get('body');
            let purge = false;
            for (let i = 0; i < paths.length; i++) {
                const p = paths[i];
                if (!purge && p.isCompletionStatement()) {
                    purge = true;
                    continue;
                }
                if (purge && !canExistAfterCompletion(p)) {
                    removeOrVoid(p);
                }
            }
        },
        ReturnStatement(path) {
            const { node } = path;
            if (!path.inList) {
                return;
            }
            if (path.container.length - 1 !== path.key &&
                !canExistAfterCompletion(path.getSibling(path.key + 1)) &&
                path.parentPath.isBlockStatement()) {
                path.parentPath.pushContext(path.context);
                path.parentPath.visit();
                path.parentPath.popContext();
                return;
            }
            if (node.argument) {
                return;
            }
            let noNext = true;
            let parentPath = path.parentPath;
            while (parentPath && !parentPath.isFunction() && noNext) {
                if (hasLoopParent(parentPath)) {
                    noNext = false;
                    break;
                }
                const nextPath = parentPath.getSibling(parentPath.key + 1);
                if (nextPath.node) {
                    if (nextPath.isReturnStatement()) {
                        nextPath.pushContext(path.context);
                        nextPath.visit();
                        nextPath.popContext();
                        if (parentPath.getSibling(parentPath.key + 1).node) {
                            noNext = false;
                            break;
                        }
                    }
                    else {
                        noNext = false;
                        break;
                    }
                }
                parentPath = parentPath.parentPath;
            }
            if (noNext) {
                removeOrVoid(path);
            }
        },
        ConditionalExpression(path) {
            const { node } = path;
            const evaluateTest = evaluateTruthy(path.get('test'));
            if (evaluateTest === true) {
                path.replaceWith(node.consequent);
            }
            else if (evaluateTest === false) {
                path.replaceWith(node.alternate);
            }
        },
        SwitchStatement: {
            exit(path) {
                const discriminantPath = path.get('discriminant');
                const evaluated = evaluate(discriminantPath, { tdz: this.tdz });
                if (!evaluated.confident)
                    return;
                let beforeTest = [];
                if (t.isSequenceExpression(discriminantPath.node)) {
                    const expressions = discriminantPath.get('expressions');
                    const lastExpression = expressions[expressions.length - 1];
                    if (!lastExpression.isPure()) {
                        return;
                    }
                    beforeTest = [
                        t.expressionStatement(t.sequenceExpression(expressions
                            .slice(0, expressions.length - 1)
                            .map(path => path.node)))
                    ];
                }
                else if (!discriminantPath.isPure()) {
                    return;
                }
                const discriminant = evaluated.value;
                const cases = path.get('cases');
                let matchingCaseIndex = -1;
                let defaultCaseIndex = -1;
                for (let i = 0; i < cases.length; i++) {
                    const test = cases[i].get('test');
                    if (test.node === null) {
                        defaultCaseIndex = i;
                        continue;
                    }
                    const testResult = evaluate(test, {
                        tdz: this.tdz
                    });
                    if (!testResult.confident)
                        return;
                    if (testResult.value === discriminant) {
                        matchingCaseIndex = i;
                        break;
                    }
                }
                let result;
                if (matchingCaseIndex === -1) {
                    if (defaultCaseIndex === -1) {
                        path.skip();
                        path.replaceWithMultiple(extractVars(path));
                        return;
                    }
                    else {
                        result = getStatementsUntilBreak(defaultCaseIndex);
                    }
                }
                else {
                    result = getStatementsUntilBreak(matchingCaseIndex);
                }
                if (result.bail)
                    return;
                replaceSwitch([
                    ...extractVars(path),
                    ...beforeTest,
                    ...result.statements
                ]);
                function getStatementsUntilBreak(start) {
                    const result = { bail: false, statements: [] };
                    for (let i = start; i < cases.length; i++) {
                        const consequent = cases[i].get('consequent');
                        for (let j = 0; j < consequent.length; j++) {
                            const _isBreaking = isBreaking(consequent[j], path);
                            if (_isBreaking.bail) {
                                result.bail = true;
                                return result;
                            }
                            if (_isBreaking.break) {
                                return result;
                            }
                            else {
                                result.statements.push(consequent[j].node);
                            }
                        }
                    }
                    return result;
                }
                function replaceSwitch(statements) {
                    let isBlockRequired = false;
                    for (let i = 0; i < statements.length; i++) {
                        if (t.isVariableDeclaration(statements[i], { kind: 'let' })) {
                            isBlockRequired = true;
                            break;
                        }
                        if (t.isVariableDeclaration(statements[i], { kind: 'const' })) {
                            isBlockRequired = true;
                            break;
                        }
                    }
                    if (isBlockRequired) {
                        path.replaceWith(t.BlockStatement(statements));
                    }
                    else {
                        path.replaceWithMultiple(statements);
                    }
                }
            }
        },
        WhileStatement(path) {
            const test = path.get('test');
            const result = evaluate(test, { tdz: this.tdz });
            if (result.confident && test.isPure() && !result.value) {
                path.replaceWithMultiple(extractVars(path.get('body')));
            }
        },
        ForStatement(path) {
            const test = path.get('test');
            if (!test.isPure())
                return;
            const result = evaluate(test, { tdz: this.tdz });
            if (result.confident) {
                if (result.value) {
                    test.remove();
                }
                else {
                    const init = path.get('init');
                    if (init.node && !init.isPure()) {
                        path.replaceWith(init);
                    }
                    else {
                        path.remove();
                    }
                }
            }
        },
        DoWhileStatement(path) {
            const test = path.get('test');
            const result = evaluate(test, { tdz: this.tdz });
            if (result.confident && test.isPure() && !result.value) {
                const body = path.get('body');
                if (body.isBlockStatement()) {
                    const stmts = body.get('body');
                    for (const stmt of stmts) {
                        const _isBreaking = isBreaking(stmt, path);
                        if (_isBreaking.bail || _isBreaking.break)
                            return;
                        const _isContinuing = isContinuing(stmt, path);
                        if (_isContinuing.bail || isContinuing.continue)
                            return;
                    }
                    path.replaceWith(body.node);
                }
                else if (body.isBreakStatement()) {
                    const _isBreaking = isBreaking(body, path);
                    if (_isBreaking.bail)
                        return;
                    if (_isBreaking.break)
                        path.remove();
                }
                else if (body.isContinueStatement()) {
                    return;
                }
                else {
                    path.replaceWith(body.node);
                }
            }
        },
        AssignmentExpression(path) {
            if (!path.get('left').isIdentifier() ||
                !path.parentPath.isExpressionStatement()) {
                return;
            }
            const prev = path.parentPath.getSibling(path.parentPath.key - 1);
            if (!(prev && prev.isVariableDeclaration())) {
                return;
            }
            const declars = prev.node.declarations;
            if (declars.length !== 1 ||
                declars[0].init ||
                declars[0].id.name !== path.get('left').node.name) {
                return;
            }
            declars[0].init = path.node.right;
            removeOrVoid(path);
        },
        FunctionExpression(path) {
            if (!this.keepFnName) {
                removeUnreferencedId(path);
            }
        },
        ClassExpression(path) {
            if (!this.keepClassName) {
                removeUnreferencedId(path);
            }
        },
        ForInStatement(path) {
            const left = path.get('left');
            if (!left.isIdentifier()) {
                return;
            }
            const binding = path.scope.getBinding(left.node.name);
            if (!binding) {
                return;
            }
            if (binding.scope.getFunctionParent() !== path.scope.getFunctionParent()) {
                return;
            }
            if (!binding.path.isVariableDeclarator()) {
                return;
            }
            if (binding.path.parentPath.parentPath.isForInStatement({
                left: binding.path.parent
            })) {
                return;
            }
            if (binding.path.parent.declarations.length > 1) {
                return;
            }
            if (binding.path.node.init) {
                return;
            }
            removeOrVoid(binding.path);
            path.node.left = t.variableDeclaration('var', [
                t.variableDeclarator(left.node)
            ]);
            binding.path = path.get('left').get('declarations')[0];
        }
    };
    return {
        name: 'minify-dead-code-elimination',
        visitor: {
            Function: {
                exit(path) {
                    const body = path.get('body');
                    if (body.isBlockStatement()) {
                        removeUseStrict(body);
                    }
                }
            },
            IfStatement: {
                exit(path, { opts: { tdz = false } = {} }) {
                    const consequent = path.get('consequent');
                    const alternate = path.get('alternate');
                    const test = path.get('test');
                    const evalResult = evaluate(test, { tdz });
                    const isPure = test.isPure();
                    const replacements = [];
                    if (evalResult.confident && !isPure && test.isSequenceExpression()) {
                        replacements.push(t.expressionStatement(extractSequenceImpure(test)));
                    }
                    if (evalResult.confident && evalResult.value) {
                        path.replaceWithMultiple([
                            ...replacements,
                            ...toStatements(consequent),
                            ...extractVars(alternate)
                        ]);
                        return;
                    }
                    if (evalResult.confident && !evalResult.value) {
                        if (alternate.node) {
                            path.replaceWithMultiple([
                                ...replacements,
                                ...toStatements(alternate),
                                ...extractVars(consequent)
                            ]);
                            return;
                        }
                        else {
                            path.replaceWithMultiple([
                                ...replacements,
                                ...extractVars(consequent)
                            ]);
                        }
                    }
                    if (alternate.isBlockStatement() && !alternate.node.body.length) {
                        alternate.remove();
                        path.node.alternate = null;
                    }
                    if (consequent.isBlockStatement() &&
                        !consequent.node.body.length &&
                        alternate.isBlockStatement() &&
                        alternate.node.body.length) {
                        consequent.replaceWith(alternate.node);
                        alternate.remove();
                        path.node.alternate = null;
                        test.replaceWith(t.unaryExpression('!', test.node, true));
                    }
                }
            },
            EmptyStatement(path) {
                if (path.parentPath.isBlockStatement() || path.parentPath.isProgram()) {
                    path.remove();
                }
            },
            Program: {
                exit(path, { opts: { optimizeRawSize = false, keepFnName = false, keepClassName = false, keepFnArgs = false, tdz = false } = {} } = {}) {
                    path.scope.crawl();
                    markEvalScopes(path);
                    path.traverse(main, {
                        functionToBindings: new Map(),
                        optimizeRawSize,
                        keepFnName,
                        keepClassName,
                        keepFnArgs,
                        tdz
                    });
                }
            }
        }
    };
    function toStatements(path) {
        const { node } = path;
        if (path.isBlockStatement()) {
            let hasBlockScoped = false;
            for (let i = 0; i < node.body.length; i++) {
                const bodyNode = node.body[i];
                if (t.isBlockScoped(bodyNode)) {
                    hasBlockScoped = true;
                }
            }
            if (!hasBlockScoped) {
                return node.body;
            }
        }
        return [node];
    }
    function extractVars(path) {
        const declarators = [];
        if (path.isVariableDeclaration({ kind: 'var' })) {
            for (const decl of path.node.declarations) {
                const bindingIds = Object.keys(t.getBindingIdentifiers(decl.id));
                declarators.push(...bindingIds.map(name => t.variableDeclarator(t.identifier(name))));
            }
        }
        else {
            path.traverse({
                VariableDeclaration(varPath) {
                    if (!varPath.isVariableDeclaration({ kind: 'var' }))
                        return;
                    if (!isSameFunctionScope(varPath, path))
                        return;
                    for (const decl of varPath.node.declarations) {
                        const bindingIds = Object.keys(t.getBindingIdentifiers(decl.id));
                        declarators.push(...bindingIds.map(name => t.variableDeclarator(t.identifier(name))));
                    }
                }
            });
        }
        if (declarators.length <= 0)
            return [];
        return [t.variableDeclaration('var', declarators)];
    }
    function replace(path, options) {
        const { replacement, replacementPath, scope, binding } = options;
        if (scope.getBinding(path.node.name) !== binding) {
            return;
        }
        if (scope !== path.scope) {
            if (t.isClass(replacement) || t.isFunction(replacement)) {
                return;
            }
            let bail = false;
            traverse(replacement, {
                Function(path) {
                    if (bail) {
                        return;
                    }
                    bail = true;
                    path.stop();
                }
            }, scope);
            if (bail) {
                return;
            }
        }
        if (path.find(({ node }) => node === replacement)) {
            return;
        }
        if (replacementPath.isFunctionDeclaration()) {
            const fnName = replacementPath.get('id').node.name;
            for (let name in replacementPath.scope.bindings) {
                if (name === fnName) {
                    return;
                }
            }
        }
        if (!t.isExpression(replacement)) {
            t.toExpression(replacement);
        }
        path.replaceWith(replacement);
        return true;
    }
    function updateReferences(fnToDeletePath) {
        if (!fnToDeletePath.isFunction()) {
            return;
        }
        fnToDeletePath.traverse({
            ReferencedIdentifier(path) {
                const { node, scope } = path;
                const binding = scope.getBinding(node.name);
                if (!binding ||
                    !binding.path.isFunction() ||
                    binding.scope === scope ||
                    !binding.constant) {
                    return;
                }
                const index = binding.referencePaths.indexOf(path);
                if (index === -1) {
                    return;
                }
                binding.references--;
                binding.referencePaths.splice(index, 1);
                if (binding.references === 0) {
                    binding.referenced = false;
                }
                if (binding.references <= 1 && binding.scope.path.node) {
                    binding.scope.path.node[shouldRevisit] = true;
                }
            }
        });
    }
    function removeUnreferencedId(path) {
        const id = path.get('id').node;
        if (!id) {
            return;
        }
        const { node, scope } = path;
        const binding = scope.getBinding(id.name);
        if (binding && (binding.path.node !== node || !binding.referenced)) {
            node.id = null;
        }
    }
    function isAncestor(path1, path2) {
        return !!path2.findParent(parent => parent === path1);
    }
    function isSameFunctionScope(path1, path2) {
        return path1.scope.getFunctionParent() === path2.scope.getFunctionParent();
    }
    function isBreaking(stmt, path) {
        return isControlTransfer(stmt, path, 'break');
    }
    function isContinuing(stmt, path) {
        return isControlTransfer(stmt, path, 'continue');
    }
    function isControlTransfer(stmt, path, control = 'break') {
        const { [control]: type } = {
            break: 'BreakStatement',
            continue: 'ContinueStatement'
        };
        if (!type) {
            throw new Error('Can only handle break and continue statements');
        }
        const checker = `is${type}`;
        if (stmt[checker]()) {
            return _isControlTransfer(stmt, path);
        }
        let isTransferred = false;
        let result = {
            [control]: false,
            bail: false
        };
        stmt.traverse({
            [type](cPath) {
                if (isTransferred)
                    return;
                result = _isControlTransfer(cPath, path);
                if (result.bail || result[control]) {
                    isTransferred = true;
                }
            }
        });
        return result;
        function _isControlTransfer(cPath, path) {
            const label = cPath.get('label');
            if (label.node !== null) {
                if (!isSameFunctionScope(path, cPath)) {
                    return {
                        break: false,
                        bail: false
                    };
                }
                let labelPath;
                if (path.scope.getLabel) {
                    labelPath = getLabel(label.node.name, path);
                }
                else {
                    labelPath = path.scope.getBinding(label.node.name).path;
                }
                const _isAncestor = isAncestor(labelPath, path);
                return {
                    bail: _isAncestor,
                    [control]: _isAncestor
                };
            }
            let isCTransfer = true;
            let possibleRunTimeControlTransfer = false;
            let parent = cPath.parentPath;
            while (parent !== stmt.parentPath) {
                if (parent.isLoop() || parent.isSwitchCase()) {
                    possibleRunTimeControlTransfer = false;
                    isCTransfer = false;
                    break;
                }
                if (parent.isIfStatement()) {
                    possibleRunTimeControlTransfer = true;
                }
                parent = parent.parentPath;
            }
            return {
                [control]: possibleRunTimeControlTransfer || isCTransfer,
                bail: possibleRunTimeControlTransfer
            };
        }
    }
    function canExistAfterCompletion(path) {
        return (path.isFunctionDeclaration() ||
            path.isVariableDeclaration({ kind: 'var' }));
    }
    function getLabel(name, _path) {
        let label, path = _path;
        do {
            label = path.scope.getLabel(name);
            if (label) {
                return label;
            }
        } while ((path = path.parentPath));
        return null;
    }
    function hasLoopParent(path) {
        let parent = path;
        do {
            if (parent.isLoop()) {
                return true;
            }
        } while ((parent = parent.parentPath));
        return false;
    }
    function extractSequenceImpure(seq) {
        const expressions = seq.get('expressions');
        const result = [];
        for (let i = 0; i < expressions.length; i++) {
            if (!expressions[i].isPure()) {
                result.push(expressions[i].node);
            }
        }
        return t.sequenceExpression(result);
    }
};
