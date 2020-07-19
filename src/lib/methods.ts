import { ClickCellType } from "./titlehelper";
import { FullAction, Nanoflow } from "../../typings/DynamicTableProps";
import { OpenPageAs } from "@jeltemx/mendix-react-widget-utils";
import { Action } from "./interfaces";

export const getClassMethod = (attr: string): ((obj: mendix.lib.MxObject) => string) => {
    return (obj: mendix.lib.MxObject): string => {
        if (!obj || !attr) {
            return "";
        }
        return obj.get(attr) as string;
    };
};

export const getSortMethod = (attr: string): ((obj: mendix.lib.MxObject) => string | null | number) => {
    return (obj: mendix.lib.MxObject): string | null | number => {
        if (!obj || !attr) {
            return null;
        }
        return obj.get(attr) as string | number;
    };
};

export interface ActionPreparation {
    object?: mendix.lib.MxObject | null;
    action?: Action;
}

export const prepareAction = (
    _obj: mendix.lib.MxObject,
    _clickType: ClickCellType,
    entityProp: string,
    clickType: ClickCellType,
    fullAction: FullAction,
    pageName: string,
    openAs: OpenPageAs,
    microflow: string,
    nanoflow: Nanoflow
): ActionPreparation => {
    const entityName = _obj.getEntity();

    const action: Action = {};
    let object: mendix.lib.MxObject | null = null;

    if (entityName === entityProp) {
        object = _obj;
    }
    if (clickType !== _clickType) {
        return { object, action };
    }
    if (fullAction === "open" && pageName) {
        action.page = {
            pageName,
            openAs
        };
    } else if (fullAction === "microflow" && microflow) {
        action.microflow = microflow;
    } else if (fullAction === "nanoflow" && nanoflow.nanoflow) {
        action.nanoflow = nanoflow;
    }

    return { object, action };
};
