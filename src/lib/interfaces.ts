import { IAction } from "@jeltemx/mendix-react-widget-utils";

export type AxisSelection = "row" | "column";
export interface Action extends IAction {}
export type ActionReturn = string | number | boolean | mendix.lib.MxObject | mendix.lib.MxObject[] | void;
export type NodeType = "unknown" | "row" | "column" | "entry";

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
