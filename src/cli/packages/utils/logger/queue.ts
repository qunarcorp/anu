/**
 * error: [
 *   {
 *      id,
 *      level,
 *      msg
 *   }
 * ]
 */

export interface Log {
    id: string;
    level?: string;
    msg: string;
    loc?: {
        line: string;
        column: string;
    }
}

export const build: Array<string> = [];
export let error: Array<Log> = [];
export const warning: Array<Log> = [];

export const setError =  (newError: Array<Log>) => {
    error = newError;
};