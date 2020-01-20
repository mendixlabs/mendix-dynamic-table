export interface TableRecord {
    key: string;
    guid: string;
    children?: string[];
    _mxReferences?: string[];
    _className?: string;
    _classObj: {
        [key: string]: string;
    };
    [other: string]: unknown;
}
