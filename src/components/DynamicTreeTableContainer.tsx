import { Component, ReactNode, createElement, CSSProperties, Fragment, version, useEffect, createRef } from "react";

console.log(version);

import { observer } from "mobx-react";
import classNames from "classnames";
import ReactResizeDetector from "react-resize-detector";
import { TableStore } from "../store/store";
import { SelectionMode, DynamicTableSettingsProps } from "../../typings/DynamicTableProps";
import Table, { ColumnProps } from "antd/es/table";
import { TableRowSelection } from "antd/es/table/interface";
import { TableRecord } from "../lib/interfaces";
import { SizeContainer } from "./SizeContainer";
import { ClickCellType } from "../lib/titlehelper";
import { Alerts } from "./Alerts";
import { withResizeDetector } from "react-resize-detector";

const DEBOUNCE = 250;

export interface DynamicTreeTableContainerProps {
    store: TableStore;

    className?: string;
    style?: CSSProperties;

    clickToSelect?: boolean;
    selectMode?: SelectionMode;
    onSelect?: (ids: string[]) => void;
    buttonBar?: ReactNode;
    hideSelectBoxes?: boolean;

    expanderFunc?: (record: TableRecord, level: number) => void;
    emptyClickHandler?: (clickType: ClickCellType, colGuid: string, rowGuid: string) => Promise<void>;

    ui: DynamicTableSettingsProps;
}

@observer
export class DynamicTreeTableContainer extends Component<DynamicTreeTableContainerProps, {}> {
    wrapper = createRef<HTMLDivElement>();

    onExpand = this.expanderHandler.bind(this);
    onRowClassName = this.rowClassName.bind(this);
    clearDebounce = this._clearDebounce.bind(this);
    onRow = this._onRow.bind(this);

    private debounce: number | null = null;

    render(): ReactNode {
        const { selectMode, store, hideSelectBoxes, className, ui } = this.props;

        const removeValidation = store.removeValidationMessage.bind(store);

        let rowSelection: TableRowSelection<TableRecord> | undefined;

        if (selectMode && selectMode !== "none") {
            rowSelection = {
                type: "checkbox",
                selectedRowKeys: store.selectedRowsIds,
                onChange: (keys: string[]): void => {
                    if (selectMode === "multi") {
                        store.setSelected(keys);
                    }
                },
                onSelectAll: (): void => {
                    if (selectMode === "single" && store.selectedRowsIds.length > 0) {
                        store.setSelected([]);
                    }
                },
                onSelect: (record: TableRecord, selected: boolean, selectedRows: TableRecord[]): void => {
                    if (selectMode === "single") {
                        if (selected) {
                            store.setSelected([record.key]);
                        } else {
                            store.setSelected(selectedRows.map(row => row.key));
                        }
                    }
                }
            };
        }

        const onResizeHandle = (width: number, height: number): void => {
            if (!!width && !!height) {
                store.setDimenions(width, height);
            }
        };

        const scrollY = ui.settingsTableLockHeaderRow ? ui.settingsHeight || true : false;

        console.log(scrollY);

        const containerIfNotDisabled = store.disabled ? null : (
            <Fragment>
                <SizeContainer
                    className={classNames("widget-dynamictable")}
                    width={ui.settingsWidth}
                    height={ui.settingsHeight}
                    widthUnit={ui.settingsWidthUnit}
                    heightUnit={ui.settingsHeightUnit}
                >
                    <Table
                        columns={this.getColumns(store.tableColumns)}
                        dataSource={store.tableRows}
                        loading={store.isLoading}
                        onExpand={this.onExpand}
                        onRow={this.onRow()}
                        rowSelection={rowSelection}
                        pagination={false}
                        rowClassName={this.onRowClassName}
                        scroll={{ x: store.width || true, y: scrollY ? "100%" : "100%" }}
                        size="small"
                    />
                    <ReactResizeDetector
                        targetRef={this.wrapper}
                        handleHeight
                        handleWidth
                        refreshMode="throttle"
                        refreshRate={100}
                        onResize={onResizeHandle}
                    ></ReactResizeDetector>
                </SizeContainer>
            </Fragment>
        );

        return (
            <div
                ref={this.wrapper}
                className={classNames(
                    "widget-dynamictable-wrapper",
                    hideSelectBoxes ? "hide-selectboxes" : null,
                    className
                )}
            >
                <Alerts validationMessages={store.validationMessages} remove={removeValidation} />
                {containerIfNotDisabled}
            </div>
        );
    }

    private _clearDebounce(): void {
        if (this.debounce !== null) {
            clearTimeout(this.debounce);
            this.debounce = null;
        }
    }

    private _onRow() {
        const { selectMode, clickToSelect, store } = this.props;

        const onRow = (record: TableRecord): { [name: string]: () => void } => {
            return {
                onClick: (): void => {
                    this.clearDebounce();
                    this.debounce = window.setTimeout(() => {
                        // this.onRowClick(record);
                        if (selectMode && selectMode !== "none" && clickToSelect) {
                            const selected = [...store.selectedRowsIds];
                            const findKey = selected.findIndex(s => s === record.key);
                            const isSelected = findKey !== -1;
                            if (isSelected && selectMode === "single") {
                                store.setSelected([]);
                            } else if (isSelected && selectMode === "multi") {
                                selected.splice(findKey, 1);
                                store.setSelected(selected);
                            } else if (!isSelected && selectMode === "single") {
                                store.setSelected([record.key]);
                            } else if (!isSelected && selectMode === "multi") {
                                selected.push(record.key);
                                store.setSelected(selected);
                            }
                        }
                    }, DEBOUNCE);
                },
                onDoubleClick: (): void => {
                    this.clearDebounce();
                    this.debounce = window.setTimeout(() => {
                        // this.onRowDblClick(record); // double click row
                    }, DEBOUNCE);
                }
            };
        };

        return onRow;
    }

    private getColumns(dataColumns: Array<ColumnProps<TableRecord>>): Array<ColumnProps<TableRecord>> {
        const { ui, emptyClickHandler } = this.props;
        const leftWidth = ui.settingsTableLeftColumnWidth || 200;
        const leftFixed = ui.settingsTableLockLeftColumn;
        const cellWidth = ui.settingsTableCellColumnWidth || 100;

        return [
            {
                key: "row-title",
                dataIndex: "row-title",
                title: "",
                className: "left-column",
                width: leftWidth,
                fixed: leftFixed ? "left" : false,
                onCell: (record: TableRecord): any => {
                    return {
                        className: classNames(record._className, "first-column")
                    };
                }
            },
            ...dataColumns.map(col => {
                const colProp: ColumnProps<TableRecord> = {
                    ...col,
                    width: cellWidth,
                    onCell: (record: TableRecord): any => {
                        const empty =
                            col.dataIndex &&
                            typeof record[col.dataIndex as number] !== "undefined" &&
                            record[col.dataIndex as number] === null;
                        const colGuid = col.dataIndex;

                        const extraClass =
                            col.key && record._classObj && record._classObj[col.key] ? record._classObj[col.key] : "";
                        const opts: any = {
                            className: classNames(
                                col.className,
                                record._className,
                                extraClass,
                                empty ? "empty--cell" : ""
                            )
                        };

                        if (empty && colGuid && record.key) {
                            opts.onClick = (): void => {
                                emptyClickHandler && emptyClickHandler("single", colGuid as string, record.key);
                            };
                            opts.onDoubleClick = (): void => {
                                emptyClickHandler && emptyClickHandler("double", colGuid as string, record.key);
                            };
                        }

                        return opts;
                    }
                };
                return colProp;
            })
        ];
    }

    private expanderHandler(expanded: boolean, record: TableRecord): void {
        if (expanded && record.children && record.children.length === 0 && this.props.expanderFunc) {
            this.props.expanderFunc(record, 0);
        }
    }

    private rowClassName(record: TableRecord, index: number): string {
        const className =
            typeof record._className !== "undefined" && record._className !== null ? " " + record._className : "";
        return `dynamictable-treelevel-${index}${className}`;
    }
}
