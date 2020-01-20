import { Component, ReactNode, createElement } from "react";
import { findDOMNode } from "react-dom";
import { hot } from "react-hot-loader/root";

import {
    DynamicTableContainerProps,
    DataSource,
    Nanoflow,
    TitleDataSourceType,
    DynamicTableSettingsProps
} from "../typings/DynamicTableProps";
import { DynamicTreeTableContainer } from "./components/DynamicTreeTableContainer";

import "./ui/DynamicTable.scss";
import { TableStore, TableGuids } from "./store/store";
import {
    fetchByXpath,
    IAction,
    getObjectContextFromObjects,
    executeMicroflow,
    executeNanoFlow,
    openPage,
    getObjects,
    ValidationMessage,
    entityIsPersistable
} from "@jeltemx/mendix-react-widget-utils";
import { createHelperObject } from "./util/helperobject";
import { getTitleFromObject, ClickCellType } from "./util/titlehelper";
import { TitleMethod } from "./store/objects/abstract/table-object";
import { TableRecord } from "./util/table";
import { getObject } from "@jeltemx/mendix-react-widget-utils";
import { ValidateExtraProps, validateProps } from "./util/validation";

export type AxisSelection = "row" | "column";
export interface Action extends IAction {}
export type ActionReturn = string | number | boolean | mendix.lib.MxObject | mendix.lib.MxObject[] | void;
export type NodeType = "unknown" | "row" | "column" | "entry";

class DynamicTable extends Component<DynamicTableContainerProps> {
    private store: TableStore;
    private widgetId?: string;
    private rowChildReference: string;
    private helperRowReference: string;
    private helperColumnReference: string;
    private helperContextReference: string;
    private entryColumnReference: string;
    private entryRowReference: string;
    private hasChildAttr: string;

    constructor(props: DynamicTableContainerProps) {
        super(props);

        this.rowChildReference =
            props.childScenario === "reference" && "" !== props.childReference
                ? props.childReference.split("/")[0]
                : "";
        this.helperRowReference = props.helperRowReference ? props.helperRowReference.split("/")[0] : "";
        this.helperColumnReference = props.helperColumnReference ? props.helperColumnReference.split("/")[0] : "";
        this.helperContextReference = props.helperContextReference ? props.helperContextReference.split("/")[0] : "";
        this.entryColumnReference = props.entryColumnReference ? props.entryColumnReference.split("/")[0] : "";
        this.entryRowReference = props.entryRowReference ? props.entryRowReference.split("/")[0] : "";
        this.hasChildAttr =
            props.childScenario !== "disabled" &&
            props.childScenario !== "reference" &&
            "" === props.childReference &&
            "" !== props.childHasChildAttr
                ? props.childHasChildAttr
                : "";

        this.bindMethods();

        const validationMessages = this.getRuntimeValidations(props);

        this.store = new TableStore({
            entriesLoader: this.entriesLoad,
            onSelectionChange: this.onSelectionChange,
            validationMessages
        });
    }

    componentDidUpdate(): void {
        if (this.widgetId) {
            const domNode = findDOMNode(this);
            // @ts-ignore
            domNode.setAttribute("widgetId", this.widgetId);
        }
    }

    componentWillReceiveProps(nextProps: DynamicTableContainerProps): void {
        if (!this.widgetId) {
            const domNode = findDOMNode(this);
            // @ts-ignore
            this.widgetId = domNode.getAttribute("widgetId") || undefined;
        }
        this.store.setContext(nextProps.mxObject);
        if (nextProps.mxObject) {
            this.store.setLoading(true);
            this.fetchData(nextProps.mxObject);
        }
    }

    render(): ReactNode {
        const { selectMode, selectClickSelect, selectHideCheckboxes, selectOnChangeAction } = this.props;
        const {
            settingsTableCellColumnWidth,
            settingsTableLeftColumnWidth,
            settingsHeight,
            settingsHeightUnit,
            settingsTableLockHeaderRow,
            settingsTableLockLeftColumn,
            settingsWidth,
            settingsWidthUnit
        } = this.props;
        const uiProps: DynamicTableSettingsProps = {
            settingsHeight,
            settingsHeightUnit,
            settingsTableCellColumnWidth,
            settingsTableLeftColumnWidth,
            settingsTableLockHeaderRow,
            settingsTableLockLeftColumn,
            settingsWidth,
            settingsWidthUnit
        };

        let selectionMode = selectMode;
        if (
            selectMode !== "none" &&
            // buttonBar === null &&
            !(selectClickSelect && selectMode === "single") &&
            selectOnChangeAction === "nothing"
        ) {
            selectionMode = "none";
        }

        return (
            <DynamicTreeTableContainer
                store={this.store}
                selectMode={selectionMode}
                hideSelectBoxes={selectHideCheckboxes}
                expanderFunc={this.expanderFunc}
                emptyClickHandler={this.clickEmptyHandler}
                clickToSelect={selectClickSelect}
                ui={uiProps}
            />
        );
    }

    private bindMethods(): void {
        this.entriesLoad = this.entriesLoad.bind(this);
        this.executeAction = this.executeAction.bind(this);
        this.setAxisObjects = this.setAxisObjects.bind(this);
        this.getTitleMethod = this.getTitleMethod.bind(this);
        this.getClassMethod = this.getClassMethod.bind(this);
        this.expanderFunc = this.expanderFunc.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.clickTypeHandler = this.clickTypeHandler.bind(this);
        this.clickEmptyHandler = this.clickEmptyHandler.bind(this);
        this.getRuntimeValidations = this.getRuntimeValidations.bind(this);
    }

    private getRuntimeValidations(props: DynamicTableContainerProps): ValidationMessage[] {
        const runTimeValidations: ValidateExtraProps = {};

        if (props.helperEntity !== "" && entityIsPersistable(props.helperEntity)) {
            runTimeValidations.noPersistentHelper = true;
        }

        return validateProps(props, runTimeValidations);
    }

    private fetchData(obj: mendix.lib.MxObject): void {
        const {
            rowEntity,
            rowDataSource,
            rowConstraint,
            rowGetDataMicroflow,
            rowGetDataNanoflow,
            columnEntity,
            columnDataSource,
            columnConstraint,
            columnGetDataMicroflow,
            columnGetDataNanoflow
        } = this.props;
        this.fetchAxisData(
            "row",
            obj,
            rowEntity,
            rowDataSource,
            rowConstraint,
            rowGetDataMicroflow,
            rowGetDataNanoflow
        );
        this.fetchAxisData(
            "column",
            obj,
            columnEntity,
            columnDataSource,
            columnConstraint,
            columnGetDataMicroflow,
            columnGetDataNanoflow
        );
    }

    private async fetchAxisData(
        axis: AxisSelection,
        obj: mendix.lib.MxObject,
        entity: string,
        dataSource: DataSource,
        constraint: string,
        microflow: string,
        nanoflow: Nanoflow
    ): Promise<void> {
        this.debug("fetchAxisData", axis, obj ? obj.getGuid() : null, entity, {
            dataSource,
            constraint,
            microflow,
            nanoflow
        });
        const actionHandler = (action: Action): void => {
            this.executeAction(action, true, obj).then((result: mendix.lib.MxObject[]) => {
                if (result) {
                    this.setAxisObjects(axis, result);
                }
            });
        };

        if (dataSource === "xpath" && entity && obj) {
            const objects = await fetchByXpath(obj, entity, constraint);
            if (objects) {
                this.setAxisObjects(axis, objects);
            }
        } else if (dataSource === "microflow" && microflow && obj) {
            actionHandler({ microflow });
        } else if (dataSource === "nanoflow" && nanoflow && nanoflow.nanoflow && obj) {
            actionHandler({ nanoflow });
        } else {
            this.store.setLoading(false);
        }
    }

    private setAxisObjects(
        axis: AxisSelection,
        objects: mendix.lib.MxObject[],
        clean = true,
        parent: string | null = null
    ): void {
        const {
            rowTitleType,
            rowTitleAttr,
            rowTitleNanoflow,
            rowClassAttr,
            columnTitleType,
            columnTitleAttr,
            columnTitleNanoflow,
            columnClassAttr
        } = this.props;
        if (axis === "row") {
            this.store.setRows(objects, this.rowChildReference, this.hasChildAttr, parent, clean, {
                classMethod: this.getClassMethod(rowClassAttr),
                titleMethod: this.getTitleMethod(rowTitleType, rowTitleAttr, rowTitleNanoflow, "row")
            });
        } else {
            this.store.setColumns(objects, {
                classMethod: this.getClassMethod(columnClassAttr),
                titleMethod: this.getTitleMethod(columnTitleType, columnTitleAttr, columnTitleNanoflow, "column")
            });
        }
    }

    private getTitleMethod(
        titleType: TitleDataSourceType,
        attribute: string,
        nanoflow: Nanoflow,
        nodeType: NodeType = "unknown"
    ): TitleMethod {
        const renderAsHTML =
            (this.props.rowRenderAsHTML && nodeType === "row") ||
            (this.props.columnRenderAsHTML && nodeType === "column") ||
            (this.props.entryRenderAsHTML && nodeType === "entry");
        return (obj: mendix.lib.MxObject): Promise<ReactNode> =>
            getTitleFromObject(obj, {
                attribute,
                executeAction: this.executeAction,
                nanoflow,
                titleType,
                nodeType,
                onClickMethod: () => this.clickTypeHandler(obj, nodeType, "single"),
                onDoubleClickMethod: () => this.clickTypeHandler(obj, nodeType, "double"),
                renderAsHTML
            });
    }

    private getClassMethod(attr: string): (obj: mendix.lib.MxObject) => string {
        return (obj: mendix.lib.MxObject): string => {
            if (!obj || !attr) {
                return "";
            }
            return obj.get(attr) as string;
        };
    }

    private async clickTypeHandler(
        _obj: mendix.lib.MxObject,
        _nodeType: NodeType = "unknown",
        _clickType: ClickCellType = "single"
    ): Promise<void> {
        if (!_obj) {
            return;
        }

        this.debug("clickCell", `${_clickType} || ${_nodeType} || ${_obj ? _obj.getGuid() : null}`);

        const entityName = _obj.getEntity();
        let object: mendix.lib.MxObject | null = null;
        const action: Action = {};

        switch (_nodeType) {
            case "column":
                if (entityName === this.props.columnEntity) {
                    object = _obj;
                }
                if (this.props.eventColumnClickFormat !== _clickType) {
                    break;
                }
                if (this.props.eventColumnOnClickAction === "open" && this.props.eventColumnOnClickForm) {
                    action.page = {
                        pageName: this.props.eventColumnOnClickForm,
                        openAs: this.props.eventColumnOnClickOpenPageAs
                    };
                } else if (this.props.eventColumnOnClickAction === "microflow" && this.props.eventColumnOnClickMf) {
                    action.microflow = this.props.eventColumnOnClickMf;
                } else if (
                    this.props.eventColumnOnClickAction === "nanoflow" &&
                    this.props.eventColumnOnClickNf.nanoflow
                ) {
                    action.nanoflow = this.props.eventColumnOnClickNf;
                }
                break;
            case "row":
                if (entityName === this.props.rowEntity) {
                    object = _obj;
                }
                if (this.props.eventRowClickFormat !== _clickType) {
                    break;
                }
                if (this.props.eventRowOnClickAction === "open" && this.props.eventRowOnClickForm) {
                    action.page = {
                        pageName: this.props.eventRowOnClickForm,
                        openAs: this.props.eventRowOnClickOpenPageAs
                    };
                } else if (this.props.eventRowOnClickAction === "microflow" && this.props.eventRowOnClickMf) {
                    action.microflow = this.props.eventRowOnClickMf;
                } else if (this.props.eventRowOnClickAction === "nanoflow" && this.props.eventRowOnClickNf.nanoflow) {
                    action.nanoflow = this.props.eventRowOnClickNf;
                }
                break;
            case "entry":
                if (entityName === this.props.entryEntity) {
                    object = _obj;
                }
                if (this.props.eventEntryClickFormat !== _clickType) {
                    break;
                }
                if (this.props.eventEntryOnClickAction === "open" && this.props.eventEntryOnClickForm) {
                    action.page = {
                        pageName: this.props.eventEntryOnClickForm,
                        openAs: this.props.eventEntryOnClickOpenPageAs
                    };
                } else if (this.props.eventEntryOnClickAction === "microflow" && this.props.eventEntryOnClickMf) {
                    action.microflow = this.props.eventEntryOnClickMf;
                } else if (
                    this.props.eventEntryOnClickAction === "nanoflow" &&
                    this.props.eventEntryOnClickNf.nanoflow
                ) {
                    action.nanoflow = this.props.eventEntryOnClickNf;
                }
                break;
            default:
                break;
        }

        if (
            object !== null &&
            (typeof action.microflow !== "undefined" ||
                typeof action.nanoflow !== "undefined" ||
                typeof action.page !== "undefined")
        ) {
            this.executeAction(action, true, object);
        }
    }

    private async clickEmptyHandler(clickType: ClickCellType = "single", col: string, row: string): Promise<void> {
        this.debug("clickEmpty", clickType, `col: ${col} || row: ${row}`);

        const colGuid = col.replace("col-", "");
        const { eventEmptyClickFormat, eventEmptyOnClickAction, eventEmptyOnClickMf, eventEmptyOnClickNf } = this.props;

        if (clickType !== eventEmptyClickFormat || eventEmptyOnClickAction === "nothing" || !colGuid || !row) {
            return;
        }

        const guids: TableGuids = {
            context: this.props.mxObject ? this.props.mxObject.getGuid() : null,
            rows: [row],
            columns: [colGuid]
        };

        const helperObject = await this.createHelper(guids);

        if (!helperObject) {
            return;
        }

        const action: Action = {};

        if (eventEmptyOnClickAction === "microflow" && eventEmptyOnClickMf) {
            action.microflow = eventEmptyOnClickMf;
        } else if (eventEmptyOnClickAction === "nanoflow" && eventEmptyOnClickNf.nanoflow) {
            action.nanoflow = eventEmptyOnClickNf;
        }

        if (typeof action.microflow !== "undefined" || typeof action.nanoflow !== "undefined") {
            this.executeAction(action, true, helperObject);
        }
    }

    private async entriesLoad(guids: TableGuids, setStore = true, clean = true): Promise<void | mendix.lib.MxObject[]> {
        if (guids && guids.context && guids.columns && guids.rows) {
            if (setStore) {
                this.store.setLoading(true);
            }

            const helperObject = await this.createHelper(guids);

            if (!helperObject) {
                if (setStore) {
                    this.store.setLoading(false);
                }
                return;
            }

            const {
                entryDataSource,
                entryGetDataMicroflow,
                entryGetDataNanoflow,
                entryTitleType,
                entryTitleAttr,
                entryTitleNanoflow,
                entryClassAttr
            } = this.props;

            let entryObjects: mendix.lib.MxObject[] = [];

            if (entryDataSource === "microflow" && entryGetDataMicroflow) {
                entryObjects = (await this.executeAction(
                    { microflow: entryGetDataMicroflow },
                    true,
                    helperObject
                )) as mendix.lib.MxObject[];
            } else if (entryDataSource === "nanoflow" && entryGetDataNanoflow && entryGetDataNanoflow.nanoflow) {
                entryObjects = (await this.executeAction(
                    { nanoflow: entryGetDataNanoflow },
                    true,
                    helperObject
                )) as mendix.lib.MxObject[];
            }

            if (entryObjects) {
                if (setStore) {
                    this.store.setEntries(entryObjects, this.entryRowReference, this.entryColumnReference, clean, {
                        classMethod: this.getClassMethod(entryClassAttr),
                        titleMethod: this.getTitleMethod(entryTitleType, entryTitleAttr, entryTitleNanoflow, "entry")
                    });
                } else {
                    return entryObjects;
                }
            }
        }
        if (setStore) {
            this.store.setLoading(false);
        }
    }

    private async expanderFunc(record: TableRecord): Promise<void> {
        const { childScenario, childActionMethod, childActionMicroflow, childActionNanoflow } = this.props;

        let children: mendix.lib.MxObject[] | null = null;

        if (typeof record._mxReferences !== "undefined" && record._mxReferences.length > 0) {
            this.store.setLoading(true);
            children = await getObjects(record._mxReferences as string[]);
        } else if (
            childScenario === "action" &&
            typeof record.children !== "undefined" &&
            record.children.length === 0 &&
            ((childActionMethod === "microflow" && childActionMicroflow) ||
                (childActionMethod === "nanoflow" && childActionNanoflow.nanoflow))
        ) {
            const action: Action = {};
            const rowObj = await getObject(record.guid);

            if (!rowObj) {
                return;
            }

            if (childActionMethod === "microflow") {
                action.microflow = childActionMicroflow;
            } else {
                action.nanoflow = childActionNanoflow;
            }

            this.store.setLoading(true);

            children = (await this.executeAction(action, true, rowObj)) as mendix.lib.MxObject[];
        }

        if (children) {
            this.setAxisObjects("row", children, false, record.key);

            const guids = this.store.tableGuids;
            guids.rows = children.map(obj => obj.getGuid());
            const entries = await this.entriesLoad(guids, false);
            if (entries) {
                const { entryTitleType, entryTitleAttr, entryTitleNanoflow, entryClassAttr } = this.props;
                this.store.setEntries(entries, this.entryRowReference, this.entryColumnReference, false, {
                    classMethod: this.getClassMethod(entryClassAttr),
                    titleMethod: this.getTitleMethod(entryTitleType, entryTitleAttr, entryTitleNanoflow, "entry")
                });
            }
        }
        this.store.setLoading(false);
    }

    private async onSelectionChange(tableGuids: TableGuids): Promise<void> {
        const { selectOnChangeAction, selectOnChangeMicroflow, selectOnChangeNanoflow } = this.props;
        if (selectOnChangeAction === "nothing") {
            return;
        }
        const action: Action = {};
        if (selectOnChangeAction === "microflow" && selectOnChangeMicroflow) {
            action.microflow = selectOnChangeMicroflow;
        } else if (selectOnChangeAction === "nanoflow" && selectOnChangeNanoflow && selectOnChangeNanoflow.nanoflow) {
            action.nanoflow = selectOnChangeNanoflow;
        }

        if (action.microflow || action.nanoflow) {
            const helperObj = await this.createHelper(tableGuids);
            if (helperObj) {
                this.executeAction(action, true, helperObj);
            }
        }
    }

    private async createHelper(tableGuids: TableGuids): Promise<mendix.lib.MxObject | null> {
        const obj = await createHelperObject({
            colGuids: tableGuids.columns,
            contextGuid: tableGuids.context,
            helperColumnReference: this.helperColumnReference,
            helperContextReference: this.helperContextReference,
            helperEntity: this.props.helperEntity,
            helperRowReference: this.helperRowReference,
            rowGuids: tableGuids.rows
        });
        return obj;
    }

    private executeAction(action: Action, showError = false, obj?: mendix.lib.MxObject): Promise<ActionReturn> {
        this.debug("executeAction", action, obj && obj.getGuid());
        const { mxform } = this.props;
        const context = getObjectContextFromObjects(obj, this.props.mxObject);

        if (action.microflow) {
            return executeMicroflow(action.microflow, context, mxform, showError);
        } else if (action.nanoflow) {
            return executeNanoFlow(action.nanoflow, context, mxform, showError);
        } else if (action.page) {
            return openPage(action.page, context, showError);
        }

        return Promise.reject(
            new Error(`No microflow/nanoflow/page defined for this action: ${JSON.stringify(action)}`)
        );
    }

    private debug(...args: unknown[]): void {
        const id = this.props.friendlyId || this.widgetId;
        if (window.logger) {
            window.logger.debug(`${id}:`, ...args);
        }
    }
}

export default hot(DynamicTable);
