import { computed, flow, observable, action } from "mobx";
import { ReactNode } from "react";

export type TitleMethod = ((obj: mendix.lib.MxObject) => Promise<ReactNode | string>) | null;
export type ClassMethod = ((obj: mendix.lib.MxObject) => string) | null;

export interface TableObjectGetOptions {
    titleMethod?: TitleMethod;
    classMethod?: ClassMethod;
}

export interface TableObjectOptions {
    mxObject: mendix.lib.MxObject;
    changeHandler?: (guid?: string, removedCb?: (removed: boolean) => void) => void | Promise<void>;
    getMethods: TableObjectGetOptions;
}

export class TableObject {
    public _type = "TableObject";
    public _obj: mendix.lib.MxObject;
    public _subscriptions: number[];
    public _changeHandler: (guid?: string, removedCb?: (removed: boolean) => void) => void;

    public _titleMethod: TitleMethod;
    public _classMethod: ClassMethod;

    @observable _title: string;
    @observable _class: string;

    fixTitle = flow(function*(this: TableObject) {
        if (this._titleMethod) {
            const title = yield this._titleMethod(this._obj);
            this._title = title;
        }
    });

    constructor(opts: TableObjectOptions) {
        const { mxObject, changeHandler, getMethods } = opts;
        const { titleMethod, classMethod } = getMethods;
        this._obj = mxObject;

        this._title = "";
        this._class = "";
        this._titleMethod = titleMethod || null;
        this._classMethod = classMethod || null;
        this._changeHandler = changeHandler || ((): void => {});
        this._subscriptions = [];

        if (!changeHandler) {
            console.log("No changehandler for ", opts);
        }

        if (titleMethod) {
            this.fixTitle();
        }

        if (classMethod) {
            this.fixClass();
        }

        if (this._obj) {
            this.resetSubscription();
        }
    }

    @action
    clearSubscriptions(): void {
        const { unsubscribe } = window.mx.data;
        this._subscriptions.forEach(subscription => unsubscribe(subscription));
        this._subscriptions = [];
    }

    @action
    fixClass(): void {
        if (this._classMethod) {
            this._class = this._classMethod(this._obj);
        }
    }

    @action
    resetSubscription(): void {
        const { subscribe } = window.mx.data;
        this.clearSubscriptions();
        if (this._obj) {
            const subscription = subscribe({
                guid: this._obj.getGuid(),
                callback: guid => {
                    if (window.logger) {
                        window.logger.debug(`Dynamic table subscription fired: ${this._type} || ${guid}`);
                    }
                    this._changeHandler(`${guid}`, removed => {
                        if (removed) {
                            if (window.logger) {
                                window.logger.debug(`Removed: ${this._type} || ${guid}`);
                            }
                        } else {
                            this.fixTitle();
                        }
                    });
                }
            });
            this._subscriptions.push(subscription);
        }
    }

    @computed
    get title(): string {
        return this._title;
    }

    @computed
    get className(): string {
        return this._class;
    }

    @computed
    get guid(): string {
        return this._obj.getGuid();
    }
}
