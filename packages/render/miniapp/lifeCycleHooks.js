import { useLayoutEffect } from "react-core/hooks";
import { Renderer } from 'react-core/createRenderer';
import { lifeCycleList } from './registerPage.wx';

const allLifecycle = [
    'onLoad',
    'onReady',
    'onUnload',
].concat(lifeCycleList);

function usePageEvent(eventName, callback) {
    if (!allLifecycle.includes(eventName)) {
        // eslint-disable-next-line no-console
        console.error('小程序没有'+ eventName + '生命周期，请仔细检查');
        return;
    }

    const pageInstance = Renderer.currentOwner;
    useLayoutEffect(() => {
        return registerLifecycle(pageInstance, eventName, callback);
    });

}

function registerLifecycle(pageInstance, lifecycle, callback) {

    const lifecycleCallback = pageInstance.lifecycleCallback || (pageInstance.lifecycleCallback = {});
    pageInstance.lifecycleCallback[lifecycle] = lifecycleCallback[lifecycle] || [];

    pageInstance.lifecycleCallback[lifecycle].push(callback);
    return () => {
        pageInstance.lifecycleCallback[lifecycle].splice(pageInstance.lifecycleCallback[lifecycle].indexOf(callback), 1);
    };
}




export {
    usePageEvent,
};