import {
    useReducerImpl,
    useEffectImpl,
    useRef,
    useMemo,
    useCallback,
    useContext,
    useImperativeHandle,
    useQueryImpl
} from "react-fiber/dispatcher";
import { PASSIVE, HOOK } from "react-fiber/effectTag";

function useState(initValue) {
    return useReducerImpl(null, initValue);
}
function useReducer(reducer, initValue, initAction) {
    return useReducerImpl(reducer, initValue, initAction);
}
function useEffect(create, deps) {
    return useEffectImpl(create, deps, PASSIVE, "passive", "unpassive");
}
function useLayoutEffect(create, deps) {
    return useEffectImpl(create, deps, HOOK, "layout", "unlayout");
}

function useQuery() {
    return useQueryImpl();
}

export {
    useState,
    useReducer,
    useEffect,
    useLayoutEffect,
    useMemo,
    useCallback,
    useRef,
    useContext, //这个不对
    useImperativeHandle,
    useQuery,
};
