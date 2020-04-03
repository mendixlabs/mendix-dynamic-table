// import { CSSProperties } from "react";
import { ICommonWidgetProps, INanoflow } from "@jeltemx/mendix-react-widget-utils";

export interface Nanoflow extends INanoflow {}
export interface CommonProps extends ICommonWidgetProps {}

export type DataSource = "xpath" | "microflow" | "nanoflow";
export type SimpleDataSource = "microflow" | "nanoflow";
export type ChildScenario = "disabled" | "reference" | "action";
export type TitleDataSourceType = "attribute" | "nanoflow";
export type SelectionMode = "none" | "single" | "multi";
export type ClickType = "single" | "double";
export type SimpleAction = "nothing" | "microflow" | "nanoflow";
export type FullAction = "nothing" | "microflow" | "nanoflow" | "open";
export type SortingType = "asc" | "desc";

export namespace TableStyle {
    export type HeightUnitType = "percentageOfWidth" | "percentageOfParent" | "pixels";
    export type WidthUnitType = "percentage" | "pixels";
}

export interface DynamicTableEventProps {
    eventRowOnClickAction: FullAction;
    eventRowClickFormat: ClickType;
    eventRowOnClickMf: string;
    eventRowOnClickNf: Nanoflow;
    eventRowOnClickForm: string;
    eventRowOnClickOpenPageAs: PageLocation;

    eventColumnOnClickAction: FullAction;
    eventColumnClickFormat: ClickType;
    eventColumnOnClickMf: string;
    eventColumnOnClickNf: Nanoflow;
    eventColumnOnClickForm: string;
    eventColumnOnClickOpenPageAs: PageLocation;

    eventEntryOnClickAction: FullAction;
    eventEntryClickFormat: ClickType;
    eventEntryOnClickMf: string;
    eventEntryOnClickNf: Nanoflow;
    eventEntryOnClickForm: string;
    eventEntryOnClickOpenPageAs: PageLocation;

    eventEmptyOnClickAction: SimpleAction;
    eventEmptyClickFormat: ClickType;
    eventEmptyOnClickMf: string;
    eventEmptyOnClickNf: Nanoflow;
}

interface DynamicTableRowProps {
    rowEntity: string;
    rowDataSource: DataSource;
    rowConstraint: string;
    rowGetDataMicroflow: string;
    rowGetDataNanoflow: Nanoflow;
    rowSortingAttribute: string;
    rowSortingOrder: SortingType;
    rowTitleType: TitleDataSourceType;
    rowTitleAttr: string;
    rowTitleNanoflow: Nanoflow;
    rowRenderAsHTML: boolean;
    rowClassAttr: string;
}

interface DynamicTableChildProps {
    childScenario: ChildScenario;
    childReference: string;
    childHasChildAttr: string;
    childActionMethod: SimpleDataSource;
    childActionMicroflow: string;
    childActionNanoflow: Nanoflow;
}

interface DynamicTableColumnProps {
    columnEntity: string;
    columnDataSource: DataSource;
    columnConstraint: string;
    columnGetDataMicroflow: string;
    columnGetDataNanoflow: Nanoflow;
    columnSortingAttribute: string;
    columnSortingOrder: SortingType;
    columnTitleType: TitleDataSourceType;
    columnTitleAttr: string;
    columnTitleNanoflow: Nanoflow;
    columnRenderAsHTML: boolean;
    columnClassAttr: string;
}

interface DynamicTableEntryProps {
    entryEntity: string;
    entryRowReference: string;
    entryColumnReference: string;
    entryDataSource: SimpleDataSource;
    entryGetDataMicroflow: string;
    entryGetDataNanoflow: Nanoflow;
    entryTitleType: TitleDataSourceType;
    entryTitleAttr: string;
    entryTitleNanoflow: Nanoflow;
    entryRenderAsHTML: boolean;
    entryClassAttr: string;
}

interface DynamicTableHelperProps {
    helperEntity: string;
    helperRowReference: string;
    helperColumnReference: string;
    helperContextReference: string;
}

interface DynamicTableSelectionProps {
    selectMode: SelectionMode;
    selectClickSelect: boolean;
    selectHideCheckboxes: boolean;
    selectOnChangeAction: SimpleAction;
    selectOnChangeMicroflow: string;
    selectOnChangeNanoflow: Nanoflow;
}

interface DynamicTableSettingsProps {
    settingsTableLeftColumnWidth: number;
    settingsTableCellColumnWidth: number;
    settingsTableLockHeaderRow: boolean;
    settingsTableLockLeftColumn: boolean;
    settingsWidthUnit: TableStyle.WidthUnitType;
    settingsWidth: number;
    settingsHeightUnit: TableStyle.HeightUnitType;
    settingsHeight: number;
}

export interface DynamicTableContainerProps
    extends CommonProps,
        DynamicTableRowProps,
        DynamicTableChildProps,
        DynamicTableColumnProps,
        DynamicTableEntryProps,
        DynamicTableHelperProps,
        DynamicTableSelectionProps,
        DynamicTableEventProps,
        DynamicTableSettingsProps {}

export type VisibilityMap = {
    [P in keyof DynamicTableContainerProps]: boolean;
};
