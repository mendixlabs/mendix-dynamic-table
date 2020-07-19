import { DynamicTableSettingsProps, DynamicTableContainerProps } from "../../typings/DynamicTableProps";

export const getPartialUIProps = (props: DynamicTableContainerProps): DynamicTableSettingsProps => {
    const {
        settingsTableCellColumnWidth,
        settingsTableLeftColumnWidth,
        settingsHeight,
        settingsHeightUnit,
        settingsTableLockHeaderRow,
        settingsTableLockLeftColumn,
        settingsWidth,
        settingsWidthUnit
    } = props;

    return {
        settingsHeight,
        settingsHeightUnit,
        settingsTableCellColumnWidth,
        settingsTableLeftColumnWidth,
        settingsTableLockHeaderRow,
        settingsTableLockLeftColumn,
        settingsWidth,
        settingsWidthUnit
    };
};
