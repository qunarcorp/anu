"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Children", {
  enumerable: true,
  get: function get() {
    return _Children.Children;
  }
});
Object.defineProperty(exports, "Component", {
  enumerable: true,
  get: function get() {
    return _Component.Component;
  }
});
Object.defineProperty(exports, "PureComponent", {
  enumerable: true,
  get: function get() {
    return _PureComponent.PureComponent;
  }
});
Object.defineProperty(exports, "createElement", {
  enumerable: true,
  get: function get() {
    return _createElement.createElement;
  }
});
Object.defineProperty(exports, "useComponent", {
  enumerable: true,
  get: function get() {
    return _utils.useComponent;
  }
});
Object.defineProperty(exports, "useState", {
  enumerable: true,
  get: function get() {
    return _hooks.useState;
  }
});
Object.defineProperty(exports, "useReducer", {
  enumerable: true,
  get: function get() {
    return _hooks.useReducer;
  }
});
Object.defineProperty(exports, "useCallback", {
  enumerable: true,
  get: function get() {
    return _hooks.useCallback;
  }
});
Object.defineProperty(exports, "useMemo", {
  enumerable: true,
  get: function get() {
    return _hooks.useMemo;
  }
});
Object.defineProperty(exports, "useEffect", {
  enumerable: true,
  get: function get() {
    return _hooks.useEffect;
  }
});
Object.defineProperty(exports, "useContext", {
  enumerable: true,
  get: function get() {
    return _hooks.useContext;
  }
});
Object.defineProperty(exports, "useRef", {
  enumerable: true,
  get: function get() {
    return _hooks.useRef;
  }
});
Object.defineProperty(exports, "createRef", {
  enumerable: true,
  get: function get() {
    return _createRef.createRef;
  }
});
Object.defineProperty(exports, "memo", {
  enumerable: true,
  get: function get() {
    return _memo.memo;
  }
});
exports["default"] = void 0;

var _Children = require("react-core/Children");

var _PropTypes = require("react-core/PropTypes");

var _Component = require("react-core/Component");

var _PureComponent = require("react-core/PureComponent");

var _createElement = require("react-core/createElement");

var _createContext = require("react-core/createContext");

var _util = require("react-core/util");

var _eventSystem = require("./eventSystem");

var _render = require("./render.all");

var _toStyle = require("./toStyle");

var _utils = require("./utils");

var _registerAPIs = require("./registerAPIs");

var _index = require("./apiForAlipay/index");

var _registerApp = require("./registerApp.all");

var _registerComponent = require("./registerComponent.ali");

var _registerPage = require("./registerPage.wx");

var _hooks = require("react-core/hooks");

var _createRef = require("react-core/createRef");

var _memo = require("react-fiber/memo");

//小程序的API注入
var render = _render.Renderer.render;
var React = (0, _util.getWindow)().React = {
  //平台相关API
  eventSystem: {
    dispatchEvent: _eventSystem.dispatchEvent
  },
  findDOMNode: function findDOMNode() {
    console.log("小程序不支持findDOMNode");
    /* eslint-disable-line */
  },
  //fiber底层API
  version: "VERSION",
  render: render,
  hydrate: render,
  webview: _eventSystem.webview,
  Fragment: _util.Fragment,
  PropTypes: _PropTypes.PropTypes,
  createRef: _createRef.createRef,
  Component: _Component.Component,
  // createPortal,
  createElement: _createElement.createElement,
  createFactory: _createElement.createFactory,
  createContext: _createContext.createContext,
  // cloneElement,
  PureComponent: _PureComponent.PureComponent,
  isValidElement: _createElement.isValidElement,
  toClass: _util.miniCreateClass,
  getCurrentPage: _utils.getCurrentPage,
  getCurrentPages: _utils._getCurrentPages,
  getApp: _utils._getApp,
  registerApp: _registerApp.registerApp,
  registerComponent: _registerComponent.registerComponent,
  registerPage: _registerPage.registerPage,
  toStyle: _toStyle.toStyle,
  memo: _memo.memo,
  useState: _hooks.useState,
  useReducer: _hooks.useReducer,
  useCallback: _hooks.useCallback,
  useMemo: _hooks.useMemo,
  useEffect: _hooks.useEffect,
  useLayoutEffect: _hooks.useLayoutEffect,
  useContext: _hooks.useContext,
  useComponent: _utils.useComponent,
  useRef: _hooks.useRef,
  appType: "ali"
};
var apiContainer = {};

if (typeof my != "undefined") {
  apiContainer = my; //eslint-disable-line
}

(0, _registerAPIs.registerAPIs)(React, apiContainer, _index.more);
var _default = React;
exports["default"] = _default;