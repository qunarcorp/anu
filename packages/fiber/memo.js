// import { miniCreateClass } from "react-core/util";
// import { Component } from "react-core/Component";
// import { createElement } from "react-core/createElement";
// import { shallowEqual } from "react-core/shallowEqual";

// var MemoComponent = miniCreateClass(
//     function MemoComponent(obj) {
//         this.render = obj.render;
//         this.shouldComponentUpdate = obj.shouldComponentUpdate
//     },
//     Component,
//     {}
// );

// export function memo(render, shouldComponentUpdate) {
//     return function (props) {
//         return createElement(MemoComponent, Object.assign(props, {
//             render: render.bind(this, props),
//             shouldComponentUpdate: shouldComponentUpdate || 
//                 function shouldComponentUpdate(nextProps, nextState) {
//                     // 增加一个默认的 shouldComponentUpdate 看看效果
//                     var a = shallowEqual(this.props, nextProps);
//                     return !a;
//                 }
//         }));
//     };
// }

import { miniCreateClass } from "react-core/util";
import { Component } from "react-core/Component";
import { createElement } from "react-core/createElement";
import { shallowEqual } from "react-core/shallowEqual";

var MemoComponent = miniCreateClass(
    function MemoComponent(obj) {
        this.render = obj.render;
    },
    Component,
    {}
);

export function memo(render, shouldComponentUpdate) {
    render.prototype.shouldComponentUpdate = shouldComponentUpdate || 
    function shouldComponentUpdate(prevProps, nextProps) {
        // 不渲染返回 true
        return shallowEqual(prevProps, nextProps);
    }
    return function (props) {
        return createElement(MemoComponent, Object.assign(props, {
            render: render.bind(this, props),
        }));
    };
}

