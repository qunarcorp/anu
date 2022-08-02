"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getWrappedComponent = getWrappedComponent;
exports._getApp = _getApp;
exports.callGlobalHook = callGlobalHook;
exports.getCurrentPage = getCurrentPage;
exports._getCurrentPages = _getCurrentPages;
exports.updateMiniApp = updateMiniApp;
exports.refreshComponent = refreshComponent;
exports.detachComponent = detachComponent;
exports.runFunction = runFunction;
exports.runCallbacks = runCallbacks;
exports.useComponent = useComponent;
exports.handleSuccess = handleSuccess;
exports.handleFail = handleFail;
exports.classCached = exports.registeredComponents = exports.usingComponents = exports.delayMounts = void 0;

var _util = require("react-core/util");

var _createElement = require("react-core/createElement");

var _createRenderer = require("react-core/createRenderer");

var fakeApp = {
  app: {
    globalData: {}
  }
};

function _getApp() {
  if ((0, _util.isFn)(getApp)) {
    return getApp();
  }

  return fakeApp;
} //获取redux-react中的connect包裹下的原始实例对象 相同点Connect.WrappedComponent, 不支持react-redux4, 7
//  https://cdn.bootcss.com/react-redux/7.1.0-alpha.1/react-redux.js
//  https://cdn.bootcss.com/react-redux/6.0.1/react-redux.js  fiber.child.child
//  https://cdn.bootcss.com/react-redux/5.1.1/react-redux.js  fiber.child


function getWrappedComponent(fiber, instance) {
  var ctor = instance.constructor;

  if (ctor.WrappedComponent) {
    if (ctor.contextTypes) {
      instance = fiber.child.stateNode;
    } else {
      instance = fiber.child.child.stateNode;
    }
  }

  return instance;
}

if (typeof getApp === 'function') {
  // 这时全局可能没有getApp
  exports._getApp = _getApp = getApp; // esline-disabled-line
}

function callGlobalHook(method, e) {
  var app = _getApp();

  if (app && app[method]) {
    return app[method](e);
  }
}

var delayMounts = [];
exports.delayMounts = delayMounts;
var usingComponents = [];
exports.usingComponents = usingComponents;
var registeredComponents = {};
exports.registeredComponents = registeredComponents;

function getCurrentPage() {
  var app = _getApp();

  return app.$$page && app.$$page.reactInstance;
}

function _getCurrentPages() {
  console.warn('getCurrentPages存在严重的平台差异性，不建议再使用'); // eslint-disable-line

  if (typeof getCurrentPages !== 'undefined') {
    return getCurrentPages(); // eslint-disable-line
  }

  return [];
} // 用于保存所有用miniCreateClass创建的类，然后在事件系统中用到


var classCached = {};
exports.classCached = classCached;

function updateMiniApp(instance) {
  if (!instance || !instance.wx) {
    return;
  }

  var data = safeClone({
    props: instance.props,
    state: instance.state || null,
    context: instance.context
  }); // 考虑无状态组件

  if (instance.FUN_DATA) {
    Object.assign(data, instance.FUN_DATA);
  }

  if (instance.wx.setData) {
    instance.wx.setData(data);
  } else {
    updateQuickApp(instance.wx, data);
  }
}

function refreshComponent(instances, wx, uuid) {
  if (wx.disposed) {
    return;
  }

  var pagePath = Object(_getApp()).$$pagePath;

  for (var i = 0, n = instances.length; i < n; i++) {
    var instance = instances[i]; //处理组件A包含组件时B，当出现多个A组件，B组件会串的问题

    if (instance.$$pagePath === pagePath && !instance.wx && instance.instanceUid === uuid) {
      var fiber = (0, _util.get)(instance);

      if (fiber.disposed) {
        console.log("fiber.disposed by nanachi");
        continue;
      } //处理mobx //fiber.type.name == 'Injector' && fiber.child.name === fiber.name会被压缩掉


      if (fiber.child && fiber.type.wrappedComponent) {
        instance = fiber.child.stateNode;
      } else {
        // 处理redux与普通情况
        instance = getWrappedComponent(fiber, instance);
      }

      instance.wx = wx;
      wx.reactInstance = instance;
      updateMiniApp(instance);
      return instances.splice(i, 1);
    }
  }
}

function detachComponent() {
  var t = this.reactInstance;
  this.disposed = true;

  if (t) {
    t.wx = null;
    this.reactInstance = null;
  }
}

function updateQuickApp(quick, data) {
  for (var i in data) {
    quick.$set(i, data[i]);
  }
}

function isReferenceType(val) {
  return (0, _util.typeNumber)(val) > 6;
}

function runFunction(fn, a, b) {
  if ((0, _util.isFn)(fn)) {
    fn.call(null, a, b);
  }
}

function runCallbacks(cb, success, fail, complete) {
  try {
    cb();
    success && success();
  } catch (error) {
    fail && fail(error);
  } finally {
    complete && complete();
  }
}

function useComponent(props) {
  var is = props.is;
  var clazz = registeredComponents[is];
  props.key = this.key != null ? this.key : props['data-instance-uid'] || new Date() - 0; //delete props.is;

  clazz.displayName = is;

  if (this.ref !== null) {
    props.ref = this.ref;
  }

  var owner = _createRenderer.Renderer.currentOwner;

  if (owner) {
    _createRenderer.Renderer.currentOwner = (0, _util.get)(owner)._owner;
  }

  return (0, _createElement.createElement)(clazz, props);
}

function handleSuccess(options) {
  var success = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _util.noop;
  var complete = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _util.noop;
  var resolve = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _util.noop;
  success(options);
  complete(options);
  resolve(options);
}

function handleFail(options) {
  var fail = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _util.noop;
  var complete = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _util.noop;
  var reject = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : _util.noop;
  fail(options);
  complete(options);
  reject(options);
}

function safeClone(originVal) {
  var temp = originVal instanceof Array ? [] : {};

  for (var item in originVal) {
    if (_util.hasOwnProperty.call(originVal, item)) {
      var value = originVal[item];

      if (isReferenceType(value)) {
        if (value.$$typeof) {
          continue;
        }

        temp[item] = safeClone(value);
      } else {
        temp[item] = value;
      }
    }
  }

  return temp;
}