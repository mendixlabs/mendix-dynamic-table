import { TableObjectOptions, TableObject } from "./abstract/table-object";
import { computed, action, observable } from "mobx";

export interface EntryObjectOptions extends TableObjectOptions {
    colGuid: string | null;
    rowGuid: string | null;
}

export class EntryObject extends TableObject {
    public _type = "Entry";

    @observable _colGuid: string | null = null;
    @observable _rowGuid: string | null = null;

    constructor(opts: EntryObjectOptions) {
        super(opts);

        this._colGuid = opts.colGuid;
        this._rowGuid = opts.rowGuid;
    }

    @action
    setColGuid(guid: string | null): void {
        this._colGuid = guid;
    }

    @action
    setRowGuid(guid: string | null): void {
        this._rowGuid = guid;
    }

    @computed
    get id(): string {
        return `entry-${this._obj.getGuid()}`;
    }

    @computed
    get col(): string | null {
        return this._colGuid;
    }

    @computed
    get row(): string | null {
        return this._rowGuid;
    }
}
