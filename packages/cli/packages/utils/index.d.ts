import { Platform } from '../../consts/platforms';
declare let utils: {
    on(): void;
    emit(): void;
    spinner(text: string): any;
    getStyleValue: any;
    useYarn(): any;
    shortcutOfCreateElement(): string;
    getNodeName(node: any): any;
    getEventName(eventName: string, nodeName: string, buildType: string): string;
    createElement(nodeName: string, attrs: any[], children: any): any;
    createNodeName(map: any, backup: any): (astPath: any, modules: any) => any;
    createAttribute(name: string, value: string | import("@babel/types").AnyTypeAnnotation | import("@babel/types").ArgumentPlaceholder | import("@babel/types").ArrayExpression | import("@babel/types").ArrayPattern | import("@babel/types").ArrayTypeAnnotation | import("@babel/types").ArrowFunctionExpression | import("@babel/types").AssignmentExpression | import("@babel/types").AssignmentPattern | import("@babel/types").AwaitExpression | import("@babel/types").BigIntLiteral | import("@babel/types").BinaryExpression | import("@babel/types").LogicalExpression | import("@babel/types").BindExpression | import("@babel/types").BlockStatement | import("@babel/types").Program | import("@babel/types").TSModuleBlock | import("@babel/types").CatchClause | import("@babel/types").DoWhileStatement | import("@babel/types").ForInStatement | import("@babel/types").ForStatement | import("@babel/types").FunctionDeclaration | import("@babel/types").FunctionExpression | import("@babel/types").ObjectMethod | import("@babel/types").SwitchStatement | import("@babel/types").WhileStatement | import("@babel/types").ForOfStatement | import("@babel/types").ClassMethod | import("@babel/types").ClassPrivateMethod | import("@babel/types").StaticBlock | import("@babel/types").BooleanLiteral | import("@babel/types").BooleanLiteralTypeAnnotation | import("@babel/types").BooleanTypeAnnotation | import("@babel/types").BreakStatement | import("@babel/types").CallExpression | import("@babel/types").ClassExpression | import("@babel/types").ClassDeclaration | import("@babel/types").ClassBody | import("@babel/types").ClassImplements | import("@babel/types").ClassPrivateProperty | import("@babel/types").ClassProperty | import("@babel/types").ContinueStatement | import("@babel/types").ReturnStatement | import("@babel/types").ThrowStatement | import("@babel/types").ConditionalExpression | import("@babel/types").IfStatement | import("@babel/types").DebuggerStatement | import("@babel/types").DecimalLiteral | import("@babel/types").VariableDeclaration | import("@babel/types").ExportAllDeclaration | import("@babel/types").ExportDefaultDeclaration | import("@babel/types").ExportNamedDeclaration | import("@babel/types").ImportDeclaration | import("@babel/types").DeclareClass | import("@babel/types").DeclareFunction | import("@babel/types").DeclareInterface | import("@babel/types").DeclareModule | import("@babel/types").DeclareModuleExports | import("@babel/types").DeclareTypeAlias | import("@babel/types").DeclareOpaqueType | import("@babel/types").DeclareVariable | import("@babel/types").DeclareExportDeclaration | import("@babel/types").DeclareExportAllDeclaration | import("@babel/types").InterfaceDeclaration | import("@babel/types").OpaqueType | import("@babel/types").TypeAlias | import("@babel/types").EnumDeclaration | import("@babel/types").TSDeclareFunction | import("@babel/types").TSInterfaceDeclaration | import("@babel/types").TSTypeAliasDeclaration | import("@babel/types").TSEnumDeclaration | import("@babel/types").TSModuleDeclaration | import("@babel/types").DeclaredPredicate | import("@babel/types").Decorator | import("@babel/types").Directive | import("@babel/types").DirectiveLiteral | import("@babel/types").DoExpression | import("@babel/types").EmptyStatement | import("@babel/types").EmptyTypeAnnotation | import("@babel/types").EnumBooleanBody | import("@babel/types").EnumNumberBody | import("@babel/types").EnumStringBody | import("@babel/types").EnumSymbolBody | import("@babel/types").EnumBooleanMember | import("@babel/types").EnumDefaultedMember | import("@babel/types").EnumNumberMember | import("@babel/types").EnumStringMember | import("@babel/types").ExistsTypeAnnotation | import("@babel/types").ExportDefaultSpecifier | import("@babel/types").ExportNamespaceSpecifier | import("@babel/types").ExportSpecifier | import("@babel/types").Identifier | import("@babel/types").StringLiteral | import("@babel/types").NumericLiteral | import("@babel/types").NullLiteral | import("@babel/types").RegExpLiteral | import("@babel/types").MemberExpression | import("@babel/types").NewExpression | import("@babel/types").ObjectExpression | import("@babel/types").SequenceExpression | import("@babel/types").ParenthesizedExpression | import("@babel/types").ThisExpression | import("@babel/types").UnaryExpression | import("@babel/types").UpdateExpression | import("@babel/types").MetaProperty | import("@babel/types").Super | import("@babel/types").TaggedTemplateExpression | import("@babel/types").TemplateLiteral | import("@babel/types").YieldExpression | import("@babel/types").Import | import("@babel/types").OptionalMemberExpression | import("@babel/types").OptionalCallExpression | import("@babel/types").TypeCastExpression | import("@babel/types").JSXElement | import("@babel/types").JSXFragment | import("@babel/types").PipelinePrimaryTopicReference | import("@babel/types").RecordExpression | import("@babel/types").TupleExpression | import("@babel/types").ModuleExpression | import("@babel/types").TSAsExpression | import("@babel/types").TSTypeAssertion | import("@babel/types").TSNonNullExpression | import("@babel/types").ExpressionStatement | import("@babel/types").File | import("@babel/types").NullLiteralTypeAnnotation | import("@babel/types").FunctionTypeAnnotation | import("@babel/types").FunctionTypeParam | import("@babel/types").GenericTypeAnnotation | import("@babel/types").InferredPredicate | import("@babel/types").InterfaceExtends | import("@babel/types").InterfaceTypeAnnotation | import("@babel/types").IntersectionTypeAnnotation | import("@babel/types").MixedTypeAnnotation | import("@babel/types").NullableTypeAnnotation | import("@babel/types").NumberLiteralTypeAnnotation | import("@babel/types").NumberTypeAnnotation | import("@babel/types").ObjectTypeAnnotation | import("@babel/types").ObjectTypeInternalSlot | import("@babel/types").ObjectTypeCallProperty | import("@babel/types").ObjectTypeIndexer | import("@babel/types").ObjectTypeProperty | import("@babel/types").ObjectTypeSpreadProperty | import("@babel/types").QualifiedTypeIdentifier | import("@babel/types").StringLiteralTypeAnnotation | import("@babel/types").StringTypeAnnotation | import("@babel/types").SymbolTypeAnnotation | import("@babel/types").ThisTypeAnnotation | import("@babel/types").TupleTypeAnnotation | import("@babel/types").TypeofTypeAnnotation | import("@babel/types").TypeAnnotation | import("@babel/types").TypeParameter | import("@babel/types").TypeParameterDeclaration | import("@babel/types").TypeParameterInstantiation | import("@babel/types").UnionTypeAnnotation | import("@babel/types").Variance | import("@babel/types").VoidTypeAnnotation | import("@babel/types").IndexedAccessType | import("@babel/types").OptionalIndexedAccessType | import("@babel/types").JSXAttribute | import("@babel/types").JSXClosingElement | import("@babel/types").JSXExpressionContainer | import("@babel/types").JSXSpreadChild | import("@babel/types").JSXOpeningElement | import("@babel/types").JSXText | import("@babel/types").JSXOpeningFragment | import("@babel/types").JSXClosingFragment | import("@babel/types").ImportAttribute | import("@babel/types").ImportDefaultSpecifier | import("@babel/types").ImportNamespaceSpecifier | import("@babel/types").ImportSpecifier | import("@babel/types").InterpreterDirective | import("@babel/types").JSXEmptyExpression | import("@babel/types").JSXIdentifier | import("@babel/types").JSXMemberExpression | import("@babel/types").JSXNamespacedName | import("@babel/types").JSXSpreadAttribute | import("@babel/types").RestElement | import("@babel/types").ObjectPattern | import("@babel/types").TSParameterProperty | import("@babel/types").LabeledStatement | import("@babel/types").Noop | import("@babel/types").NumberLiteral | import("@babel/types").ObjectProperty | import("@babel/types").PipelineBareFunction | import("@babel/types").PipelineTopicExpression | import("@babel/types").Placeholder | import("@babel/types").PrivateName | import("@babel/types").RegexLiteral | import("@babel/types").RestProperty | import("@babel/types").SpreadElement | import("@babel/types").SpreadProperty | import("@babel/types").TryStatement | import("@babel/types").WithStatement | import("@babel/types").TSImportEqualsDeclaration | import("@babel/types").TSExportAssignment | import("@babel/types").TSNamespaceExportDeclaration | import("@babel/types").SwitchCase | import("@babel/types").TSAnyKeyword | import("@babel/types").TSArrayType | import("@babel/types").TSBooleanKeyword | import("@babel/types").TSBigIntKeyword | import("@babel/types").TSIntrinsicKeyword | import("@babel/types").TSNeverKeyword | import("@babel/types").TSNullKeyword | import("@babel/types").TSNumberKeyword | import("@babel/types").TSObjectKeyword | import("@babel/types").TSStringKeyword | import("@babel/types").TSSymbolKeyword | import("@babel/types").TSUndefinedKeyword | import("@babel/types").TSUnknownKeyword | import("@babel/types").TSVoidKeyword | import("@babel/types").TSThisType | import("@babel/types").TSLiteralType | import("@babel/types").TSCallSignatureDeclaration | import("@babel/types").TSConditionalType | import("@babel/types").TSConstructSignatureDeclaration | import("@babel/types").TSConstructorType | import("@babel/types").TSDeclareMethod | import("@babel/types").TSQualifiedName | import("@babel/types").TSEnumMember | import("@babel/types").TSExpressionWithTypeArguments | import("@babel/types").TSExternalModuleReference | import("@babel/types").TSFunctionType | import("@babel/types").TSImportType | import("@babel/types").TSIndexSignature | import("@babel/types").TSIndexedAccessType | import("@babel/types").TSInferType | import("@babel/types").TSInterfaceBody | import("@babel/types").TSIntersectionType | import("@babel/types").TSMappedType | import("@babel/types").TSMethodSignature | import("@babel/types").TSNamedTupleMember | import("@babel/types").TSOptionalType | import("@babel/types").TSParenthesizedType | import("@babel/types").TSPropertySignature | import("@babel/types").TSRestType | import("@babel/types").TSTupleType | import("@babel/types").TSTypeReference | import("@babel/types").TSTypePredicate | import("@babel/types").TSTypeQuery | import("@babel/types").TSTypeLiteral | import("@babel/types").TSUnionType | import("@babel/types").TSTypeOperator | import("@babel/types").TSTypeAnnotation | import("@babel/types").TSTypeParameter | import("@babel/types").TSTypeParameterDeclaration | import("@babel/types").TSTypeParameterInstantiation | import("@babel/types").TemplateElement | import("@babel/types").V8IntrinsicIdentifier | import("@babel/types").VariableDeclarator): any;
    createUUID(astPath: any): any;
    createDynamicAttributeValue(prefix: string, astPath: any, indexes: any): any;
    genKey(key: string): string;
    getAnu(state: any): any;
    isLoopMap(astPath: any): boolean;
    createMethod(path: any, methodName: string): any;
    exportExpr(name: string, isDefault?: boolean): any;
    isNpm: any;
    createRegisterStatement(className: string, path: any, isPage?: boolean): any;
    installer(npmName: string, dev?: string, needModuleEntryPath?: boolean): Promise<unknown>;
    getDistName(buildType: string): any;
    getDeps(messages?: any[]): any[];
    getComponentOrAppOrPageReg(): RegExp;
    hasNpm(npmName: string): boolean;
    decodeChinise: any;
    isWebView(fileId: string): any;
    parseCamel: any;
    uniquefilter(arr: any, key?: string): any;
    isWin: () => any;
    sepForRegex: string;
    fixWinPath(p: string): string;
    isMportalEnv(): any;
    cleanLog(log: string): string;
    validatePlatform(platform: string, platforms: Platform[]): boolean;
    customizer(objValue: any, srcValue: any): any[];
    deepMerge(...args: any): any;
    getStyleNamespace(dirname: string): string;
    isCheckQuickConfigFileExist(configFile: string): boolean;
};
export default utils;
