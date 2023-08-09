import { isFn} from 'react-core/util';

export function registerPageHook(appHooks, pageHook, app, instance, args  ){
    for(let i = 0; i < 2; i ++){
        let method = i ? appHooks[pageHook]: pageHook;
        let host = i ?  app: instance;
        if( host && host[method] && isFn(host[method])){
           let ret = host[method](args);
           if(ret !== void 0){
                if(ret && ret.then && ret['catch']){//过滤掉Promise的情况
                    continue
                }
                return ret;
           }
        }

        if (i === 0 && host && host.__isStateless){
            return callLifecycle(host, method, args);
        }
    }
}

export function callLifecycle(instance, lifecycle, args) {
    const callbacks = (instance.lifecycleCallback && instance.lifecycleCallback[lifecycle]) || [];
    let result;
    callbacks.forEach((callback) => {
        result = callback(args);
    });
    if (result) {
        return result;
    }
}