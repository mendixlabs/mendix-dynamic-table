import { observable, action, configure, computed, when } from "mobx";
import { ColumnObject } from "./objects/column";
import { RowObject, RowObjectOptions } from "./objects/row";
import { EntryObject } from "./objects/entry";
import { TableObjectGetOptions } from "./objects/abstract/table-object";
import { ColumnProps } from "antd/es/table";
import { TableRecord } from "../lib/interfaces";
import arrayToTree, { Tree } from "array-to-tree";
import { getObject } from "@jeltemx/mendix-react-widget-utils";
import { ValidationMessage } from "../lib/validation";
import sortBy from "lodash/sortBy";

configure({ enforceActions: "observed" });

export type SortingType = "none" | "asc" | "desc";

export interface TableGuids {
    context: string | null;
    rows?: string[];
    columns?: string[];
    entries?: string[];
}

export interface TableStoreConstructorOptions {
    contextObject?: mendix.lib.MxObject;
    subscriptionHandler?: (guids: TableGuids) => void;
    onSelectionChange?: (guids: TableGuids) => void;
    entriesLoader?: (guids: TableGuids) => void;
    reloadEntriesOnColChange?: boolean;
    reloadEntriesOnRowChange?: boolean;
    validationMessages?: ValidationMessage[];
    sortingTypeRows?: SortingType;
    sortingTypeColumns?: SortingType;
}

export interface TableObjectOptions extends TableObjectGetOptions {}

const arrayToTreeOpts = {
    parentProperty: "_parent",
    customID: "key"
};

export class TableStore {
    // Properties
    public subscriptionHandler: (guids: TableGuids) => void;
    public onSelectionChangeHandler: (guids: TableGuids) => void;
    public entriesLoader: (guids: TableGuids, setStore: boolean, clean: boolean) => void;

    @observable public isLoading: boolean;
    @observable public waitingForAxis: boolean;
    @observable public contextObject: mendix.lib.MxObject | null;
    @observable public columns: ColumnObject[] = [];
    @observable public rows: RowObject[] = [];
    @observable public entries: EntryObject[] = [];

    @observable public width = 0;
    @observable public height = 0;

    @observable public validationMessages: ValidationMessage[] = [];

    private reloadOnColChange = true;
    private reloadOnRowChange = true;
    private hasEntriesLoader = false;
    private sortingTypeRows: SortingType;
    private sortingTypeColumns: SortingType;

    // Flow actions

    // Constructor
    constructor(opts: TableStoreConstructorOptions) {
        const {
            contextObject,
            subscriptionHandler,
            onSelectionChange,
            entriesLoader,
            validationMessages,
            sortingTypeRows,
            sortingTypeColumns
        } = opts;

        this.isLoading = false;
        this.waitingForAxis = false;
        this.contextObject = contextObject || null;
        this.subscriptionHandler = subscriptionHandler || ((): void => {});
        this.onSelectionChangeHandler = onSelectionChange || ((): void => {});

        this.createRowObject = this.createRowObject.bind(this);
        this.executeOnSelectionChange = this.executeOnSelectionChange.bind(this);

        this.entriesLoader = entriesLoader || ((_guids: TableGuids): void => {});
        this.hasEntriesLoader = typeof entriesLoader !== "undefined";
        this.validationMessages = validationMessages || [];

        this.sortingTypeRows = sortingTypeRows || "none";
        this.sortingTypeColumns = sortingTypeColumns || "none";
    }

    // Other actions
    @action
    public setContext(obj?: mendix.lib.MxObject): void {
        this.contextObject = obj || null;
        this.resetTable();
    }

    @action resetTable(): void {
        this.columns.forEach(col => col.clearSubscriptions());
        this.rows.forEach(row => row.clearSubscriptions());
        this.entries.forEach(entry => entry.clearSubscriptions());
        this.columns = [];
        this.rows = [];
        this.entries = [];
        if (this.hasEntriesLoader && !this.waitingForAxis) {
            this.waitingForAxis = true;
            when(
                () => {
                    return this.hasColumns && this.hasRows;
                },
                () => {
                    if (!this.disabled) {
                        this.entriesLoader(this.tableGuids, true, true);
                    }
                    this.waitingForAxis = false;
                }
            );
        }
    }

    @action
    setLoading(state: boolean): void {
        this.isLoading = state;
    }

    // Columns
    @action
    setColumns(columnObjects: mendix.lib.MxObject[], opts: TableObjectOptions): void {
        this.columns = columnObjects.map(
            mxObject => new ColumnObject({ mxObject, changeHandler: this.colHandler(opts), getMethods: opts })
        );
    }

    @action
    setColumn(index: number, object: mendix.lib.MxObject, opts: TableObjectOptions): void {
        const cloned = [...this.columns];
        if (index !== -1) {
            const colObject = new ColumnObject({
                mxObject: object,
                changeHandler: this.colHandler(opts),
                getMethods: opts
            });
            cloned[index].clearSubscriptions();
            cloned[index] = colObject;
            this.columns = cloned;
        }
    }

    @action
    removeColumn(guid: string): void {
        const found = this.columns.findIndex(column => column.guid === guid);
        if (found !== -1) {
            const cloned = [...this.columns];
            const column = cloned[found];
            column.clearSubscriptions();
            cloned.splice(found, 1);
            this.columns = cloned;
            this.removeEntriesForAxis(null, column.guid);
        }
    }

    // Rows
    @action
    setRows(
        rowObjects: mendix.lib.MxObject[],
        childRef: string,
        hasChildAttr: string,
        parent: string | null = null,
        clean = true,
        opts: TableObjectOptions
    ): void {
        const rows = rowObjects.map(mxObject =>
            this.createRowObject(
                mxObject,
                childRef,
                hasChildAttr,
                parent,
                this.rowHandler(childRef, hasChildAttr, parent, opts),
                opts
            )
        );
        if (clean) {
            this.rows = rows;
        } else {
            const cloned = [...this.rows];
            const clonedIds = cloned.map(row => row.guid);
            rows.forEach(row => {
                const index = clonedIds.indexOf(row.guid);
                if (index !== -1) {
                    cloned[index].clearSubscriptions();
                    const selected = cloned[index].selected;
                    cloned[index] = row;
                    if (selected) {
                        row.setSelected(selected);
                    }
                } else {
                    cloned.push(row);
                }
            });
            this.rows = cloned;
        }
    }

    @action
    setRow(
        object: mendix.lib.MxObject,
        childRef: string,
        hasChildAttr: string,
        parent: string | null = null,
        opts: TableObjectOptions
    ): void {
        this.setRows([object], childRef, hasChildAttr, parent, false, opts);
    }

    @action
    removeRow(guid: string): void {
        const found = this.rows.findIndex(row => row.guid === guid);
        if (found !== -1) {
            const cloned = [...this.rows];
            const row = cloned[found];
            row.clearSubscriptions();
            cloned.splice(found, 1);
            this.rows = cloned;
            this.removeEntriesForAxis(row.guid, null);
            if (row.selected) {
                this.executeOnSelectionChange();
            }
        }
    }

    // Entries

    @action
    setEntries(
        entryObjects: mendix.lib.MxObject[],
        rowRef: string | null,
        colRef: string | null,
        clean = true,
        opts: TableObjectOptions
    ): void {
        const entries = entryObjects.map(mxObject => {
            const rowGuid = rowRef !== null ? mxObject.getReference(rowRef) : null;
            const colGuid = colRef !== null ? mxObject.getReference(colRef) : null;
            const entryHandler = async (guid: string, removedCB: (removed: boolean) => void): Promise<void> => {
                const object = await getObject(guid);
                if (object) {
                    this.setEntry(object, rowRef, colRef, opts);
                    removedCB && removedCB(false);
                } else {
                    this.removeEntry(guid);
                    removedCB && removedCB(true);
                }
            };
            return new EntryObject({
                mxObject,
                colGuid,
                rowGuid,
                changeHandler: entryHandler,
                getMethods: opts
            });
        });
        if (clean) {
            this.entries = entries;
        } else {
            const cloned = [...this.entries];
            const clonedIds = cloned.map(e => e.guid);
            entries.forEach(entry => {
                const index = clonedIds.indexOf(entry.guid);
                if (index !== -1) {
                    cloned[index].clearSubscriptions();
                    cloned[index] = entry;
                } else {
                    cloned.push(entry);
                }
            });
            this.entries = cloned;
        }
    }

    @action
    setEntry(
        entryObject: mendix.lib.MxObject,
        rowRef: string | null,
        colRef: string | null,
        opts: TableObjectOptions
    ): void {
        this.setEntries([entryObject], rowRef, colRef, false, opts);
    }

    @action
    removeEntry(guid: string): void {
        const found = this.entries.findIndex(entry => entry.guid === guid);
        if (found !== -1) {
            const cloned = [...this.entries];
            const entry = cloned[found];
            entry.clearSubscriptions();
            cloned.splice(found, 1);
            this.entries = cloned;
        }
    }

    @action
    removeEntriesForAxis(rowGuid: string | null, colGuid: string | null): void {
        const entries = rowGuid
            ? this.entries.filter(entry => entry.row === rowGuid)
            : colGuid
            ? this.entries.filter(entry => entry.col === rowGuid)
            : [];
        entries.forEach(entry => this.removeEntry(entry.guid));
    }

    // Selection

    @action
    setSelected(ids: string[]): void {
        let toDo = [...ids];
        this.selectedRows.forEach(row => {
            if (toDo.indexOf(row.guid) === -1) {
                row.setSelected();
            } else {
                toDo = toDo.filter(n => n !== row.guid);
            }
        });
        toDo.forEach(n => {
            const row = this.rows.find(row => row.guid === n);
            if (row) {
                row.setSelected(true);
            }
        });
        this.executeOnSelectionChange();
    }

    // Dimensions
    @action
    setDimenions(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    @action
    setWidth(width: number): void {
        this.width = width;
    }

    @action
    setHeight(height: number): void {
        this.height = height;
    }

    // Computed

    @computed
    get hasRows(): boolean {
        return this.rows.length > 0;
    }

    @computed
    get hasColumns(): boolean {
        return this.columns.length > 0;
    }

    @computed
    get rowGuids(): string[] {
        return this.rows.filter(obj => obj.guid !== null).map(obj => obj.guid);
    }

    @computed
    get colGuids(): string[] {
        return this.columns.filter(obj => obj.guid !== null).map(obj => obj.guid);
    }

    @computed
    get tableGuids(): TableGuids {
        return {
            context: this.contextObject ? this.contextObject.getGuid() : null,
            columns: this.colGuids,
            rows: this.rowGuids
        };
    }

    @computed
    get tableColumns(): Array<ColumnProps<TableRecord>> {
        const columns = this.columns.map(col => ({
            key: col.id,
            dataIndex: col.id,
            guid: col.guid,
            title: col.title,
            sortKey: col._sortKey,
            className: col.className
        }));

        if (this.sortingTypeColumns === "asc") {
            return sortBy(columns, "sortKey");
        } else if (this.sortingTypeColumns === "desc") {
            return sortBy(columns, "sortKey").reverse();
        }
        return columns;
    }

    @computed
    get tableRows(): Tree<TableRecord[]> {
        // console.log('store.computed.tableRows', this.waitingForAxis);
        // console.time('compute');

        const rows = this.rows.map(row => {
            const record: TableRecord = {
                key: row.guid,
                guid: row.guid,
                sortKey: row.sortKey,
                "row-title": row.title,
                _classObj: {},
                _className: row.className
            };
            this.entries
                .filter(e => e.row === row.guid && e.col)
                .forEach(entry => {
                    record[`col-${entry.col}`] = entry.title;
                    record._classObj[`col-${entry.col}`] = entry.className;
                });
            this.tableColumns.forEach(col => {
                if (col.key && typeof record[col.key] === "undefined") {
                    record[col.key] = null;
                }
            });
            if (typeof row.children !== "undefined") {
                record.children = row.children;
            }
            if (typeof row.references !== "undefined") {
                record._mxReferences = row.references;
            }
            if (typeof row.hasChildren !== "undefined") {
                record._hasChildren = row.hasChildren;
            }
            if (typeof row.parent !== "undefined") {
                record._parent = row.parent;
            }
            return record;
        });

        const tree = arrayToTree(
            this.sortingTypeRows === "none"
                ? rows
                : this.sortingTypeRows === "asc"
                ? sortBy(rows, "sortKey")
                : sortBy(rows, "sortKey").reverse(),
            arrayToTreeOpts
        );

        // console.timeEnd('compute');
        return tree.filter(treeEl => typeof treeEl._parent === "undefined" && !treeEl._parent);
    }

    @computed
    get selectedRows(): RowObject[] {
        return this.rows.filter(row => row.selected);
    }

    @computed
    get selectedRowsIds(): string[] {
        return this.rows.filter(row => row.selected).map(row => row.guid);
    }

    @computed
    get disabled(): boolean {
        const fatalCount = this.validationMessages.filter(m => m.fatal).length;
        return fatalCount > 0 || this.contextObject === null;
    }

    @action addValidationMessage(message: ValidationMessage): void {
        this.validationMessages.push(message);
    }

    @action removeValidationMessage(id: string): void {
        const messages = [...this.validationMessages];
        const found = messages.findIndex(m => m.id === id);
        if (found !== -1) {
            messages.splice(found, 1);
            this.validationMessages = messages;
        }
    }

    // Other
    private createRowObject(
        mxObject: mendix.lib.MxObject,
        childRef: string,
        hasChildAttr: string,
        parent: string | null = null,
        changeHandler = (..._opts: any): void => {},
        opts: TableObjectOptions
    ): RowObject {
        const rowObjectOptions: RowObjectOptions = {
            mxObject,
            changeHandler,
            getMethods: opts
        };
        const attributes = mxObject.getAttributes();
        const referenceObjects =
            childRef !== "" && -1 < attributes.indexOf(childRef) ? mxObject.getReferences(childRef) : [];

        if (referenceObjects && referenceObjects.length > 0) {
            rowObjectOptions.children = [];
            rowObjectOptions.references = referenceObjects;
        } else if (hasChildAttr && mxObject.has(hasChildAttr)) {
            const childValue = mxObject.get(hasChildAttr) as boolean;
            rowObjectOptions.hasChildren = childValue;
            if (childValue) {
                rowObjectOptions.children = [];
            }
        }

        if (parent !== null) {
            rowObjectOptions.parentGuid = parent;
        }

        return new RowObject(rowObjectOptions);
    }

    // Execute
    private executeOnSelectionChange(): void {
        const guids: TableGuids = {
            context: this.contextObject ? this.contextObject.getGuid() : null,
            rows: this.rows.filter(obj => obj.guid !== null && obj.selected).map(row => row.guid)
        };
        this.onSelectionChangeHandler(guids);
    }

    // Handlers
    private colHandler(
        opts: TableObjectOptions
    ): (guid: string, removedCB: (removed: boolean) => void) => Promise<void> {
        return async (guid: string, removedCB: (removed: boolean) => void): Promise<void> => {
            const object = await getObject(guid);
            if (object) {
                const found = this.columns.findIndex(col => col.guid === object.getGuid());
                if (found !== -1) {
                    this.setColumn(found, object, opts);
                    this.reloadOnColChange && this.onColChange(object);
                    removedCB && removedCB(false);
                }
            } else {
                this.removeColumn(guid);
                removedCB && removedCB(true);
            }
        };
    }

    private rowHandler(
        childRef: string,
        hasChildAttr: string,
        parent: string | null,
        opts: TableObjectOptions
    ): (guid: string, removedCB: (removed: boolean) => void) => Promise<void> {
        return async (guid: string, removedCB: (removed: boolean) => void): Promise<void> => {
            const object = await getObject(guid);
            if (object) {
                const found = this.rows.findIndex(row => row.guid === object.getGuid());
                if (found !== -1) {
                    this.setRow(object, childRef, hasChildAttr, parent, opts);
                    this.reloadOnRowChange && this.onRowChange(object);
                    removedCB && removedCB(false);
                }
            } else {
                this.removeRow(guid);
                removedCB && removedCB(true);
            }
        };
    }

    private onColChange(object: mendix.lib.MxObject): void {
        if (!(this.hasColumns && this.hasRows) || !this.contextObject) {
            return;
        }
        const guids: TableGuids = {
            context: this.contextObject.getGuid(),
            rows: this.rowGuids,
            columns: [object.getGuid()]
        };
        this.entriesLoader(guids, true, false);
    }

    private onRowChange(object: mendix.lib.MxObject): void {
        if (!(this.hasColumns && this.hasRows) || !this.contextObject) {
            return;
        }
        const guids: TableGuids = {
            context: this.contextObject.getGuid(),
            rows: [object.getGuid()],
            columns: this.colGuids
        };
        this.entriesLoader(guids, true, false);
    }
}
