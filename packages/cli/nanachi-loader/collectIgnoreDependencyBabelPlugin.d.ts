declare const _default: () => {
    name: string;
    visitor: {
        Program: {
            enter(path: any, state: any): void;
            exit(path: any, state: any): void;
        };
        ImportDeclaration(path: any, state: any): void;
    };
};
export default _default;
