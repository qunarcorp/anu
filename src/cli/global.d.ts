declare module 'rd';

interface Subpackages{
    name: string;
    resource: string;
}
declare global {
    var nanachiVersion: string;
    var subpackages: Subpackages[];
}
export {};