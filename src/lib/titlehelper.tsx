import { TitleDataSourceType, Nanoflow } from "../../typings/DynamicTableProps";
import { Action, ActionReturn, NodeType } from "./interfaces";
import { ReactNode, createElement } from "react";
import classNames from "classnames";
import TemplateComponent from "react-mustache-template-component";

export type ClickCellType = "single" | "double";

export interface GetTitleOptions {
    titleType: TitleDataSourceType;
    attribute: string;
    nanoflow: Nanoflow;
    nodeType: NodeType;
    executeAction: (action: Action, showError: boolean, obj?: mendix.lib.MxObject) => Promise<ActionReturn>;
    onClickMethod: (obj: mendix.lib.MxObject, type: NodeType) => Promise<void>;
    onDoubleClickMethod: (obj: mendix.lib.MxObject, type: NodeType) => Promise<void>;
    renderAsHTML?: boolean;
}

export interface GetEmptyTitleOptions {
    onClickMethod: () => void;
    onDoubleClickMethod: () => void;
}

const DEBOUNCE = 250;
let debounce: number | null = null;
const clickDebounce = (callback: () => void): void => {
    if (debounce !== null) {
        clearTimeout(debounce);
        debounce = null;
    }
    debounce = window.setTimeout((): void => {
        if (callback) {
            callback();
        }
    }, DEBOUNCE);
};

export const getTitleNode = (
    titleText: string,
    isEmptyTitle: boolean,
    obj: mendix.lib.MxObject,
    opts: GetTitleOptions
): ReactNode => {
    const onClick = (): void =>
        clickDebounce((): void => {
            opts.onClickMethod && opts.onClickMethod(obj, opts.nodeType);
        });
    const onDblClick = (): void =>
        clickDebounce((): void => {
            opts.onDoubleClickMethod && opts.onDoubleClickMethod(obj, opts.nodeType);
        });

    if (opts.renderAsHTML) {
        return (
            <TemplateComponent
                template={titleText}
                type="div"
                className={classNames("cell", `type--${opts.nodeType}`, isEmptyTitle ? "empty--title" : "")}
                onClick={onClick}
                onDblClick={onDblClick}
            />
        );
    }

    return (
        <span
            className={classNames("cell", `type--${opts.nodeType}`, isEmptyTitle ? "empty--title" : "")}
            onClick={onClick}
            onDoubleClick={onDblClick}
        >
            {titleText}
        </span>
    );
};

export const getTitleFromObject = async (obj: mendix.lib.MxObject, opts: GetTitleOptions): Promise<ReactNode> => {
    let titleText = "";
    let isEmptyTitle = false;

    try {
        if (obj) {
            const { titleType, attribute, nanoflow, executeAction } = opts;

            if (titleType === "attribute" && attribute) {
                titleText = obj.get(attribute) as string;
            } else if (titleType === "nanoflow" && nanoflow && nanoflow.nanoflow) {
                titleText = (await executeAction({ nanoflow }, true, obj)) as string;
            }
        }
    } catch (e) {
        console.warn(e);
        titleText = "";
    }

    if (titleText === "") {
        titleText = "\u00A0";
        isEmptyTitle = true;
    }

    return getTitleNode(titleText, isEmptyTitle, obj, opts);
};

export const getStaticTitleFromObject = (obj: mendix.lib.MxObject, opts: GetTitleOptions): ReactNode => {
    let titleText = "";
    let isEmptyTitle = false;

    try {
        if (obj) {
            const { titleType, attribute } = opts;
            if (titleType === "attribute" && attribute) {
                titleText = obj.get(attribute) as string;
            }
        }
    } catch (e) {
        console.warn(e);
        titleText = "";
    }

    if (titleText === "") {
        titleText = "\u00A0";
        isEmptyTitle = true;
    }

    return getTitleNode(titleText, isEmptyTitle, obj, opts);
};

export const getEmptyEntryTitle = (opts: GetEmptyTitleOptions): ReactNode => {
    return (
        <span
            className={classNames("cell", `type--emptycell`)}
            onClick={(): void =>
                clickDebounce((): void => {
                    opts.onClickMethod && opts.onClickMethod();
                })
            }
            onDoubleClick={(): void =>
                clickDebounce((): void => {
                    opts.onDoubleClickMethod && opts.onDoubleClickMethod();
                })
            }
        >
            x
        </span>
    );
};
