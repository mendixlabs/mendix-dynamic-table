import { TableObjectOptions, TableObject } from "./abstract/table-object";
import { computed, observable, action } from "mobx";

export interface RowObjectOptions extends TableObjectOptions {
    children?: string[];
    references?: string[];
    parentGuid?: string;
    hasChildren?: boolean;
}

export class RowObject extends TableObject {
    public _type = "Row";

    @observable selected: boolean;

    private _children?: string[];
    private _references?: string[];
    private _parent?: string;
    private _hasChildren?: boolean;

    constructor(props: RowObjectOptions) {
        super(props);

        const { children, references, parentGuid, hasChildren } = props;

        this._children = children;
        this._references = references;
        this._parent = parentGuid;
        this._hasChildren = hasChildren;
        this.selected = false;
    }

    @computed
    get parent(): string | undefined {
        return this._parent;
    }

    @computed
    get hasChildren(): boolean | undefined {
        return this._hasChildren;
    }

    @computed
    get references(): string[] | undefined {
        return this._references;
    }

    @computed
    get children(): string[] | undefined {
        return this._children;
    }

    @computed
    get id(): string {
        return `row-${this._obj.getGuid()}`;
    }

    @action
    setSelected(state = false): void {
        this.selected = state;
    }
}
