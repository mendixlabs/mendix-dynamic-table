import { TableObjectOptions, TableObject } from "./abstract/table-object";
import { computed } from "mobx";

export interface ColumnObjectOptions extends TableObjectOptions {}

export class ColumnObject extends TableObject {
    public _type = "Column";

    @computed
    get id(): string {
        return `col-${this._obj.getGuid()}`;
    }
}
