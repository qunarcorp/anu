import template from '@babel/template';
import * as t from '@babel/types';
import { Node, NodePath, PluginObj } from '@babel/core';
import globalConfig from '../../../config/config';
const importedPagesTemplatePrefixCode: any = template(`
import ReactDOM from 'react-dom';
import PageWrapper from '@internalComponents/PageWrapper';
import calculateRem from '@internalComponents/HOC/calculateRem';
import Loadable from 'react-loadable';
import QunarDefaultLoading from '@qunar-default-loading';
`)();

/* const buildAsyncImport: any = template(
    `
  const PAGE_NAME = Loadable({
    loader: () => import('IMPORT_PATH'),
    loading: QunarDefaultLoading,
    delay: 300
  });`,
    {
        plugins: ['dynamicImport']
    }
); */


const hack360Share: any = template(`
    if (global && global.qh) {
        // 隐藏自带的分享按钮
        qh.hideShareMenu();
        const isShare = qh.getChannelQuerySync('from') === 'share';
        if (isShare) {
            let path = decodeURIComponent(qh.getChannelQuerySync('path'));
            path = path.replace(/^#/, '').replace(/^(web)/, '')
            React.api.navigateTo({
                url: path
            });
        }
    }
`)();

const domRender: any = template(`
window.onload = function (){
    const Wrapper = calculateRem(CLASS_NAME);
    ReactDOM.render( <Wrapper />, document.querySelector("#app" ))
};`,
{
    plugins: ['jsx']
});

const pageWrapper: any = template(`
    <PageWrapper app={this} path={this.state.path}  query={this.state.query} config={this.state.config} showBackAnimation={this.state.showBackAnimation}/>
`, {
    plugins: ['jsx']
})();
let CLASS_NAME = 'global';

const temp = `window.addEventListener('popstate', function ({
    state
  }) {
    const pages = React.getCurrentPages();
    const pathname = state.url.split('?')[0];
    const index = pages.findIndex(page => page.props.path === pathname );
    if (!CLASS_NAME.config.pages.includes(pathname)) {
        React.api.navigateBack({
          delta: 1
        });
        return;
    }
    if (index > -1) {
        React.api.navigateBack({
            delta: pages.length - 1 - index
        })
    } else {
        if (React.__isTab(pathname)) {
            React.api.switchTab({
                url: state.url
            });
        } else {
            React.api.navigateTo({
                url: state.url
            });
        }
    }
});
React.registerApp(this);
this.onLaunch();
`;
let registerTemplate = temp;

let renderDeclared = false;

module.exports = function(): PluginObj {
    const importedPages = t.arrayExpression();
    let pageIndex = 0;
    return {
        visitor: {
            Program: {
                enter(astPath: NodePath<t.Program>) {
                    const exportDefaultNode: any = astPath.node.body.find((node: Node) => {
                        return node.type === 'ExportDefaultDeclaration'
                    });
                    CLASS_NAME = exportDefaultNode.declaration.arguments[0].callee.name;
                },
                exit(astPath: NodePath<t.Program>) {
                    astPath.node.body.unshift(...importedPagesTemplatePrefixCode);
                    astPath.node.body.push(domRender({
                        CLASS_NAME: t.identifier(CLASS_NAME)
                    }));
                }
            },
            ImportDeclaration(astPath: NodePath<t.ImportDeclaration>) {
                if (astPath.get('specifiers').length !== 0) {
                    return;
                }
                const node = astPath.node;
                const importPath = node.source.value;
                if (!/pages/.test(importPath)) {
                    return;
                }
             //   const PAGE_NAME = `PAGE_${pageIndex++}`;
             //   registerTemplate += `React.registerPage(${PAGE_NAME}, '${importPath.replace(/^\./, '')}')\n`;
                const pageItem = t.stringLiteral(importPath.replace(/^\./, ''));
                
                importedPages.elements.push(pageItem);
                astPath.remove();
              //  astPath.replaceWith(buildAsyncImport({
              //      PAGE_NAME,
              //      IMPORT_PATH: importPath
              //  }));
              //  astPath.node.specifiers.push(t.importDefaultSpecifier(t.identifier(PAGE_NAME)));
            },
            ClassProperty(astPath: NodePath<t.ClassProperty>) {
                // 装饰器必须使用babel插件转义static properties 所以向config变量注入path的逻辑放到MemberExpression中
                // if (
                //     astPath.get('key').isIdentifier({
                //         name: 'config'
                //     })
                //     && astPath.get('value').isObjectExpression()
                // ) {
                //     astPath.traverse({
                //         ObjectProperty: (property: any) => {
                //             const { key, value } = property.node;
                //             let name;

                //             if (t.isIdentifier(key)) name = key.name;
                //             if (t.isStringLiteral(key)) name = key.value;

                //             if (name === 'iconPath' || name === 'selectedIconPath') {
                //                 if (t.isStringLiteral(value)) {
                //                     property
                //                         .get('value')
                //                         .replaceWith(
                //                             t.callExpression(t.identifier('require'), [
                //                                 t.stringLiteral(
                //                                     `@${value.value.replace(/^(\.?\/)/, '')}`
                //                                 )
                //                             ])
                //                         );
                //                 }
                //             }
                //         }
                //     });

                //     // 注入pages属性
                //     (astPath.get('value') as NodePath<t.ObjectExpression>).node.properties.push(t.objectProperty(t.identifier('pages'), importedPages));
                // }
            },

            ClassBody: {
                exit(astPath) {

                    /**
                     * 这里一个个展开的缘故是：import动态表达式会打包全部的文件，包含无依赖的文件。而import字符串则可在weback构建过程中通过静态分析优化依赖。
                     * 因此，一个个展开而不是写变量引用。
                     */
                    const registerPageArr = importedPages.elements.map((v:t.StringLiteral)=>{
                        const p = v.value;
                        return `{
                            loader: () => import('.${p}'),
                        }`
                    });

                    const registerPageTemplate = `[${registerPageArr.join(',')}].forEach((item,index) => {
                        React.registerPage(
                            Loadable({
                                loader: item.loader,
                                loading: QunarDefaultLoading,
                                delay: 300
                            }),
                            CLASS_NAME.config.pages[index]
                        );
                    })
                    `;
                    registerTemplate += registerPageTemplate;

                    registerTemplate += `const pathname = location.pathname.replace(/^\\/web/, '');
                    const search = location.search;
                    if (React.__isTab(pathname)) {
                      React.api.redirectTo({
                        url: pathname + search
                      });
                    } else {
                      React.api.redirectTo({
                        url: CLASS_NAME.config.pages[0]
                      });
                  
                      if (CLASS_NAME.config.pages.some(page => page === pathname)) {
                        if (pathname !== CLASS_NAME.config.pages[0]) {
                          React.api.navigateTo({
                            url: pathname + search
                          });
                        }
                      }
                    }`;
                    
    
                    const registerApp: any = template(registerTemplate, {
                        placeholderPattern: /^CLASS_NAME$/,
                        plugins: ['dynamicImport']
                    })({
                        CLASS_NAME: t.identifier(CLASS_NAME)
                    });
                    let find = false;
                    astPath.get('body').forEach((p: any) => {
                        if (p.type === 'ClassMethod' && p.node.key.name === 'componentWillMount') {
                            find = true;
                            p.node.body.body.push(...registerApp);
                        }

                        
                        if (globalConfig['360mode']) {
                            if (p.type === 'ClassMethod' && p.node.key.name === 'onLaunch') {
                                p.node.body.body.push(hack360Share);
                            }
                        }
                        //config
                    });
                    if (!find) {
                        astPath.node.body.push(
                            t.classMethod('method', t.identifier('componentWillMount'),
                                [], 
                                t.blockStatement(
                                    registerApp
                                )
                            )
                        );
                    }
                    // 如果定义了render方法，不在这里创建render
                    if (!renderDeclared) {
                        astPath.node.body.push(
                            t.classMethod('method', t.identifier('render'),
                                [], 
                                t.blockStatement(
                                    [
                                        t.returnStatement(pageWrapper.expression)
                                    ]
                                )
                            )
                        );
                    }
                }
                
            },
            ExportDefaultDeclaration(astPath: NodePath<t.ExportDefaultDeclaration>) {
                astPath.remove();
            },
            ClassMethod(astPath) {
                // 如果定义了render方法则直接将pageWrapper放入children里
                if ((astPath.get('key').node as any).name === 'render') {
                    renderDeclared = true;
                    astPath.traverse({
                        ReturnStatement(returnPath) {
                            (returnPath.get('argument').node as any).children = [pageWrapper.expression]
                        }
                    });
                }
            },
            MemberExpression(astPath) {
                if (
                    (astPath.get('object') as any).node.name === CLASS_NAME &&
                    (astPath.get('property') as any).node.name === 'config' &&
                    (
                        (astPath.parent as any).right && (astPath.parent as any).right.type === 'ObjectExpression'
                    )
                ) {
                    astPath.parentPath.traverse({
                        ObjectProperty: (property: any) => {
                            const { key, value } = property.node;
                            let name;

                            if (t.isIdentifier(key)) name = key.name;
                            if (t.isStringLiteral(key)) name = key.value;

                            if (name === 'iconPath' || name === 'selectedIconPath') {
                                if (t.isStringLiteral(value)) {
                                    property
                                        .get('value')
                                        .replaceWith(
                                            t.callExpression(t.identifier('require'), [
                                                t.stringLiteral(
                                                    `@${value.value.replace(/^(\.?\/)/, '')}`
                                                )
                                            ])
                                        );
                                }
                            }

                            if (name === 'tabBar') {
                                let buildType = process.env.ANU_ENV;
                                if (buildType === 'web') buildType = 'h5';
                                let tabBarPros = value.properties, defaultList:any = null, buildTypeList:any = null;
                                let newTabBarPros = tabBarPros.filter((el:any) => {
                                    if (el.key.name === 'list') {
                                        defaultList = el;
                                    }
                                    if (el.key.name === `${buildType}List`) {
                                        buildTypeList = el;
                                    }
                                    return el.key.name !== 'list' && el.key.name !== `${buildType}List`;
                                });

                                if (buildTypeList) {
                                    defaultList = buildTypeList;
                                    defaultList.key.name = 'list';
                                }
                                
                                value.properties = newTabBarPros.concat(defaultList || []);

                            }
                        }
                    });

                    // 注入pages属性
                    (astPath.parentPath.get('right') as NodePath<t.ObjectExpression>).node.properties.push(t.objectProperty(t.identifier('pages'), importedPages));
                }
            }
        },
        post: function(){ 
            pageIndex = 0;
            registerTemplate = temp;
        }
    };
};
