import { Component, ReactNode, createElement } from "react";
import { findDOMNode } from "react-dom";
import {
    fetchByXpath,
    getObjectContextFromObjects,
    getObject,
    getObjects,
    ValidationMessage,
    entityIsPersistable,
    executeAction,
    ActionReturnType,
    debug
} from "@jeltemx/mendix-react-widget-utils";

import "./ui/DynamicTable.scss";

import { DynamicTableContainerProps, DataSource, Nanoflow, TitleDataSourceType } from "../typings/DynamicTableProps";
import { DynamicTreeTableContainer } from "./components/DynamicTreeTableContainer";

import { TableStore, TableGuids } from "./store/store";
import { TitleMethod, TableObjectGetOptions, StaticTitleMethod } from "./store/objects/abstract/table-object";

import { createHelperObject } from "./lib/helperobject";
import { getTitleFromObject, ClickCellType, getStaticTitleFromObject } from "./lib/titlehelper";
import { validateProps } from "./lib/validation";
import { Action, NodeType, AxisSelection, TableRecord } from "./lib/interfaces";
import { getClassMethod, getSortMethod, prepareAction, ActionPreparation } from "./lib/methods";
import { getPartialUIProps } from "./lib/props";
import { createRef } from "react";

class DynamicTable extends Component<DynamicTableContainerProps> {
    ref = createRef<HTMLDivElement>();

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

        const sortingTypeRows = props.rowSortingAttribute !== "" ? props.rowSortingOrder : "none";
        const sortingTypeColumns = props.columnSortingAttribute !== "" ? props.columnSortingOrder : "none";

        const validationMessages = this.getRuntimeValidations(props);

        this.store = new TableStore({
            entriesLoader: this.entriesLoad,
            onSelectionChange: this.onSelectionChange,
            validationMessages,
            sortingTypeRows,
            sortingTypeColumns
        });
    }

    // componentDidUpdate(): void {
    //     if (this.widgetId) {
    //         const domNode = findDOMNode(this);
    //         // @ts-ignore
    //         domNode.setAttribute("widgetId", this.widgetId);
    //     }
    // }

    componentWillReceiveProps(nextProps: DynamicTableContainerProps): void {

        if (!this.widgetId && this.ref.current) {
            try {
                const domNode = findDOMNode(this);
                // @ts-ignore
                this.widgetId = domNode.getAttribute("widgetId") || undefined;
            } catch (error) {
                const domNode = findDOMNode(this.ref.current);
                // @ts-ignore
                const alternativeID = domNode.getAttribute("data-mendix-id") || undefined;
                this.widgetId = alternativeID;
            }
        }

        this.store.setContext(nextProps.mxObject);
        if (nextProps.mxObject) {
            this.store.setLoading(true);
            this.fetchData(nextProps.mxObject);
        }
    }

    render(): ReactNode {
        const { selectMode, selectClickSelect, selectHideCheckboxes, selectOnChangeAction } = this.props;

        let selectionMode = selectMode;
        if (
            selectMode !== "none" &&
            !(selectClickSelect && selectMode === "single") &&
            selectOnChangeAction === "nothing"
        ) {
            selectionMode = "none";
        }

        return (
            <div ref={this.ref} style={{height: "100%"}}>
                <DynamicTreeTableContainer
                    store={this.store}
                    selectMode={selectionMode}
                    hideSelectBoxes={selectHideCheckboxes}
                    expanderFunc={this.expanderFunc}
                    emptyClickHandler={this.clickEmptyHandler}
                    clickToSelect={selectClickSelect}
                    ui={getPartialUIProps(this.props)}
                />
            </div>
        );
    }

    private bindMethods(): void {
        this.entriesLoad = this.entriesLoad.bind(this);
        this.executeAction = this.executeAction.bind(this);
        this.setAxisObjects = this.setAxisObjects.bind(this);
        this.getTitleMethod = this.getTitleMethod.bind(this);
        this.expanderFunc = this.expanderFunc.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.clickTypeHandler = this.clickTypeHandler.bind(this);
        this.clickEmptyHandler = this.clickEmptyHandler.bind(this);
        this.getRuntimeValidations = this.getRuntimeValidations.bind(this);
    }

    private getRuntimeValidations(props: DynamicTableContainerProps): ValidationMessage[] {
        const persist = entityIsPersistable(props.helperEntity);
        return validateProps(props, {
            noPersistentHelper: props.helperEntity !== "" && (persist !== null ? persist : false)
        });
    }

    private fetchData(obj: mendix.lib.MxObject): void {
        this.fetchAxisData(
            "row",
            obj,
            this.props.rowEntity,
            this.props.rowDataSource,
            this.props.rowConstraint,
            this.props.rowGetDataMicroflow,
            this.props.rowGetDataNanoflow
        );
        this.fetchAxisData(
            "column",
            obj,
            this.props.columnEntity,
            this.props.columnDataSource,
            this.props.columnConstraint,
            this.props.columnGetDataMicroflow,
            this.props.columnGetDataNanoflow
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
        if (axis === "row") {
            const tableOptions: TableObjectGetOptions = {
                classMethod: getClassMethod(this.props.rowClassAttr),
                sortMethod: getSortMethod(this.props.rowSortingAttribute)
            };

            if (this.props.rowTitleType === "attribute" && this.props.rowTitleAttr) {
                tableOptions.staticTitleMethod = this.getTitleMethod(
                    this.props.rowTitleType,
                    this.props.rowTitleAttr,
                    this.props.rowTitleNanoflow,
                    "row"
                ) as StaticTitleMethod;
            } else {
                tableOptions.titleMethod = this.getTitleMethod(
                    this.props.rowTitleType,
                    this.props.rowTitleAttr,
                    this.props.rowTitleNanoflow,
                    "row"
                ) as TitleMethod;
            }

            this.store.setRows(objects, this.rowChildReference, this.hasChildAttr, parent, clean, tableOptions);
        } else {
            const tableOptions: TableObjectGetOptions = {
                classMethod: getClassMethod(this.props.columnClassAttr),
                sortMethod: getSortMethod(this.props.columnSortingAttribute)
            };

            if (this.props.columnTitleType === "attribute" && this.props.columnTitleAttr) {
                tableOptions.staticTitleMethod = this.getTitleMethod(
                    this.props.columnTitleType,
                    this.props.columnTitleAttr,
                    this.props.columnTitleNanoflow,
                    "column"
                ) as StaticTitleMethod;
            } else {
                tableOptions.titleMethod = this.getTitleMethod(
                    this.props.columnTitleType,
                    this.props.columnTitleAttr,
                    this.props.columnTitleNanoflow,
                    "column"
                ) as TitleMethod;
            }

            this.store.setColumns(objects, tableOptions);
        }
    }

    private getTitleMethod(
        titleType: TitleDataSourceType,
        attribute: string,
        nanoflow: Nanoflow,
        nodeType: NodeType = "unknown"
    ): TitleMethod | StaticTitleMethod {
        const renderAsHTML =
            (this.props.rowRenderAsHTML && nodeType === "row") ||
            (this.props.columnRenderAsHTML && nodeType === "column") ||
            (this.props.entryRenderAsHTML && nodeType === "entry");

        if (titleType === "attribute" && attribute) {
            return (obj: mendix.lib.MxObject): ReactNode =>
                getStaticTitleFromObject(obj, {
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

    private async clickTypeHandler(
        _obj: mendix.lib.MxObject,
        _nodeType: NodeType = "unknown",
        _clickType: ClickCellType = "single"
    ): Promise<void> {
        if (!_obj) {
            return;
        }

        this.debug("clickCell", `${_clickType} || ${_nodeType} || ${_obj.getGuid()}`);

        let nodeAction: ActionPreparation = {};

        switch (_nodeType) {
            case "column":
                nodeAction = prepareAction(
                    _obj,
                    _clickType,
                    this.props.columnEntity,
                    this.props.eventColumnClickFormat,
                    this.props.eventColumnOnClickAction,
                    this.props.eventColumnOnClickForm,
                    this.props.eventColumnOnClickOpenPageAs,
                    this.props.eventColumnOnClickMf,
                    this.props.eventColumnOnClickNf
                );
                break;
            case "row":
                nodeAction = prepareAction(
                    _obj,
                    _clickType,
                    this.props.rowEntity,
                    this.props.eventRowClickFormat,
                    this.props.eventRowOnClickAction,
                    this.props.eventRowOnClickForm,
                    this.props.eventRowOnClickOpenPageAs,
                    this.props.eventRowOnClickMf,
                    this.props.eventRowOnClickNf
                );
                break;
            case "entry":
                nodeAction = prepareAction(
                    _obj,
                    _clickType,
                    this.props.entryEntity,
                    this.props.eventEntryClickFormat,
                    this.props.eventEntryOnClickAction,
                    this.props.eventEntryOnClickForm,
                    this.props.eventEntryOnClickOpenPageAs,
                    this.props.eventEntryOnClickMf,
                    this.props.eventEntryOnClickNf
                );
                break;
            default:
                break;
        }

        if (
            nodeAction.object &&
            nodeAction.object !== null &&
            nodeAction.action &&
            (typeof nodeAction.action.microflow !== "undefined" ||
                typeof nodeAction.action.nanoflow !== "undefined" ||
                typeof nodeAction.action.page !== "undefined")
        ) {
            this.executeAction(nodeAction.action, true, nodeAction.object);
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
                    const entriesOptions: TableObjectGetOptions = {
                        classMethod: getClassMethod(entryClassAttr)
                    };

                    if (entryTitleType === "attribute" && entryTitleAttr) {
                        entriesOptions.staticTitleMethod = this.getTitleMethod(
                            entryTitleType,
                            entryTitleAttr,
                            entryTitleNanoflow,
                            "entry"
                        ) as StaticTitleMethod;
                    } else {
                        entriesOptions.titleMethod = this.getTitleMethod(
                            entryTitleType,
                            entryTitleAttr,
                            entryTitleNanoflow,
                            "entry"
                        ) as TitleMethod;
                    }

                    this.store.setEntries(
                        entryObjects,
                        this.entryRowReference,
                        this.entryColumnReference,
                        clean,
                        entriesOptions
                    );
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

                const entriesOptions: TableObjectGetOptions = {
                    classMethod: getClassMethod(entryClassAttr)
                };

                if (entryTitleType === "attribute" && entryTitleAttr) {
                    entriesOptions.staticTitleMethod = this.getTitleMethod(
                        entryTitleType,
                        entryTitleAttr,
                        entryTitleNanoflow,
                        "entry"
                    ) as StaticTitleMethod;
                } else {
                    entriesOptions.titleMethod = this.getTitleMethod(
                        entryTitleType,
                        entryTitleAttr,
                        entryTitleNanoflow,
                        "entry"
                    ) as TitleMethod;
                }

                this.store.setEntries(
                    entries,
                    this.entryRowReference,
                    this.entryColumnReference,
                    false,
                    entriesOptions
                );
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

    private executeAction(action: Action, showError = false, obj?: mendix.lib.MxObject): Promise<ActionReturnType> {
        this.debug("executeAction", action, obj && obj.getGuid());
        const context = getObjectContextFromObjects(obj, this.props.mxObject);

        return executeAction(action, showError, context, this.props.mxform);
    }

    private debug(...args: unknown[]): void {
        const id = this.props.friendlyId || this.widgetId || "mendix.filedropper.FileDropper";
        debug(id, ...args);
    }
}

export default DynamicTable;
