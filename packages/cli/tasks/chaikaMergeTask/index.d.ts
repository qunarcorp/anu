declare const runChaikaMergeTask: () => Promise<void>;
declare const runOutputCacheCodesMergeTask: () => Promise<void>;
declare const runSingleBundleWatchCacheMergeTask: () => Promise<void>;
declare const runOutputSourceConfigMergeTask: (list: any[]) => Promise<void>;
declare const runSourceConfigMoveTask: () => Promise<void>;
declare const runSourcemapMergeTask: (list: any) => Promise<void>;
export { runChaikaMergeTask, runOutputCacheCodesMergeTask, runSingleBundleWatchCacheMergeTask, runOutputSourceConfigMergeTask, runSourceConfigMoveTask, runSourcemapMergeTask, };
