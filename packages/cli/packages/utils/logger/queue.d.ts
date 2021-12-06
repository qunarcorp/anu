export interface Log {
    id: string;
    level?: string;
    msg: string;
    loc?: {
        line: string;
        column: string;
    };
}
export declare const build: Array<string>;
export declare let error: Array<Log>;
export declare const warning: Array<Log>;
export declare const setError: (newError: Log[]) => void;
