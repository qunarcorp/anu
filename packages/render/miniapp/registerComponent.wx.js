import { registeredComponents, usingComponents, refreshComponent, detachComponent } from './utils';
import { dispatchEvent } from './eventSystem';


var defer = (function() {
    var isMac = false;
    if (wx) {
      return function(cb) {
        if (isMac) {
          setTimeout(function () {
            cb && cb();
          }, 0);
        } else {
          try {
            var sys = wx.getSystemInfoSync();
            var model = (sys.system || '').toLowerCase();
            if (/mac/.test(model) || /macos/.test(model)) {
              isMac = true;
              setTimeout(function () {
                cb && cb();
              }, 0);
            } else {
              Promise.resolve().then.bind(Promise.resolve())(cb)
            }
          } catch (e) {
            return Promise.resolve().then.bind(Promise.resolve())(cb)
          }
        }
      }
    } else {
      return Promise.resolve().then.bind(Promise.resolve());
    }
})();

export function registerComponent(type, name) {
    type.isMPComponent = true;
    registeredComponents[name] = type;
    type.reactInstances = [];
    const pageLifetimes = (type.prototype.pageLifetimes || function() { return {} })();
    let instance = null;
    let config = {
        data: {
            props: {},
            state: {},
            context: {}
        },
        options: type.options,
        pageLifetimes: {
            show: function() {
              const wx = this;
              const uuid = wx.dataset.instanceUid || null;
              if (typeof pageLifetimes.show === 'function') {
                const args = Array.from(arguments);
                instance = instance || type.reactInstances.find(el => el.instanceUid === uuid);
                pageLifetimes.show.apply(instance || this, args);
              }
            },
            hide: function() {
              const wx = this;
              const uuid = wx.dataset.instanceUid || null;
              if (typeof pageLifetimes.hide === 'function') {
                const args = Array.from(arguments);
                instance = instance || type.reactInstances.find(el => el.instanceUid === uuid)
                pageLifetimes.hide.apply(instance || this, args);
              }
            }
        },
        lifetimes: {
            // 微信需要lifetimes, methods
            attached: function attached() {
                // 微信小程序的组件的实例化可能先于页面的React render,需要延迟
                // https://github.com/RubyLouvre/anu/issues/531
                let wx = this;
                defer(() => {
                    usingComponents[name] = type;
                    //如果原生微信与nanachi混合使用，外面的reactInstances在这个方法内可能出错，因此必须在这里
                    //通过type.reactInstances来取
                    let uuid = wx.dataset.instanceUid || null;
                    refreshComponent(type.reactInstances, wx, uuid);
                });
            },
            detached: detachComponent,
            error: function (e) {
                console.log(e, name)
            }
        },
        methods: {
            dispatchEvent: dispatchEvent
        }
    };
    Object.assign(config, config.lifetimes);
    return config;
}
