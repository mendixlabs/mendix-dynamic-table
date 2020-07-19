import { DynamicTableContainerProps } from "../../typings/DynamicTableProps";
import uuid from "uuid/v4";

export type TypeValidationSeverity = "fatal" | "warning";

export interface ValidateExtraProps {
    noPersistentHelper?: boolean;
}

export class ValidationMessage {
    id: string;
    message: string;
    dismissable: boolean;
    fatal: boolean;

    constructor(message: string, type: TypeValidationSeverity = "fatal") {
        this.id = uuid();
        this.message = message;
        this.dismissable = type !== "fatal";
        this.fatal = type === "fatal";
    }
}

export const validateProps = (
    props: DynamicTableContainerProps,
    extraProps: ValidateExtraProps = {}
): ValidationMessage[] => {
    const messages: ValidationMessage[] = [];
    const conditionalValidation = (condition: boolean, category: string, msg: string): void => {
        if (condition) {
            messages.push(new ValidationMessage(`${category} :: ${msg}`));
        }
    };

    const ACTION_MF = "Action is set to Microflow, but microflow is not defined";
    const ACTION_NF = "Action is set to Nanoflow, but nanoflow is not defined";
    const ACTION_PAGE = "Action is set to Open page, but page is not defined";

    conditionalValidation(
        !!extraProps.noPersistentHelper,
        "Data Helper",
        "Entry Helper entity can only be a non-persistent entity"
    );

    // Row

    conditionalValidation(
        props.rowDataSource === "microflow" && !props.rowGetDataMicroflow,
        "Row",
        "Data Source Microflow not defined"
    );
    conditionalValidation(
        props.rowDataSource === "nanoflow" && !props.rowGetDataNanoflow.nanoflow,
        "Row",
        "Data Source Nanoflow not defined"
    );
    conditionalValidation(
        props.rowTitleType === "attribute" && !props.rowTitleAttr,
        "Row",
        "Title attribute not defined"
    );
    conditionalValidation(
        props.rowTitleType === "nanoflow" && !props.rowTitleNanoflow.nanoflow,
        "Row",
        "Title Nanoflow not defined"
    );

    // Row Children

    conditionalValidation(
        props.childScenario === "reference" && !props.childReference,
        "Row Children",
        "Child reference not defined"
    );
    if (props.childScenario === "action") {
        conditionalValidation(!props.childHasChildAttr, "Row Children", "Has Child attr is not defined");
        conditionalValidation(
            props.childActionMethod === "microflow" && !props.childActionMicroflow,
            "Row Children",
            "Scenario is Microflow, but no microflow is defined!"
        );
        conditionalValidation(
            props.childActionMethod === "nanoflow" && !props.childActionNanoflow.nanoflow,
            "Row Children",
            "Scenario is Nanoflow, but no nanoflow is defined!"
        );
    }

    // Column

    conditionalValidation(
        props.columnDataSource === "microflow" && !props.columnGetDataMicroflow,
        "Row",
        "Data Source Microflow not defined"
    );
    conditionalValidation(
        props.columnDataSource === "nanoflow" && !props.columnGetDataNanoflow.nanoflow,
        "Row",
        "Data Source Nanoflow not defined"
    );
    conditionalValidation(
        props.columnTitleType === "attribute" && !props.columnTitleAttr,
        "Row",
        "Title attribute not defined"
    );
    conditionalValidation(
        props.columnTitleType === "nanoflow" && !props.columnTitleNanoflow.nanoflow,
        "Row",
        "Title Nanoflow not defined"
    );

    // Entries

    conditionalValidation(
        props.entryDataSource === "microflow" && !props.entryGetDataMicroflow,
        "Entries",
        "Data Source is Microflow, but no microflow is defined!"
    );
    conditionalValidation(
        props.entryDataSource === "nanoflow" && !props.entryGetDataNanoflow.nanoflow,
        "Entries",
        "Data Source is Nanoflow, but no nanoflow is defined!"
    );
    conditionalValidation(
        props.entryTitleType === "attribute" && !props.entryTitleAttr,
        "Entries",
        "Title attribute not defined"
    );
    conditionalValidation(
        props.entryTitleType === "nanoflow" && !props.entryTitleNanoflow.nanoflow,
        "Entries",
        "Title Nanoflow not defined"
    );

    // Selection

    conditionalValidation(
        props.selectOnChangeAction === "microflow" && !props.selectOnChangeMicroflow,
        "Selection",
        ACTION_MF
    );
    conditionalValidation(
        props.selectOnChangeAction === "nanoflow" && !props.selectOnChangeNanoflow.nanoflow,
        "Selection",
        ACTION_NF
    );

    // Events

    conditionalValidation(
        props.eventRowOnClickAction === "microflow" && !props.eventRowOnClickMf,
        "Event: Row",
        ACTION_MF
    );
    conditionalValidation(
        props.eventRowOnClickAction === "nanoflow" && !props.eventRowOnClickNf.nanoflow,
        "Event: Row",
        ACTION_NF
    );
    conditionalValidation(
        props.eventRowOnClickAction === "open" && !props.eventRowOnClickForm,
        "Event: Row",
        ACTION_PAGE
    );
    conditionalValidation(
        props.eventColumnOnClickAction === "microflow" && !props.eventColumnOnClickMf,
        "Event: Column",
        ACTION_MF
    );
    conditionalValidation(
        props.eventColumnOnClickAction === "nanoflow" && !props.eventColumnOnClickNf.nanoflow,
        "Event: Column",
        ACTION_NF
    );
    conditionalValidation(
        props.eventColumnOnClickAction === "open" && !props.eventColumnOnClickForm,
        "Event: Column",
        ACTION_PAGE
    );
    conditionalValidation(
        props.eventEntryOnClickAction === "microflow" && !props.eventEntryOnClickMf,
        "Event: Entry",
        ACTION_MF
    );
    conditionalValidation(
        props.eventEntryOnClickAction === "nanoflow" && !props.eventEntryOnClickNf.nanoflow,
        "Event: Entry",
        ACTION_NF
    );
    conditionalValidation(
        props.eventEntryOnClickAction === "open" && !props.eventEntryOnClickForm,
        "Event: Entry",
        ACTION_PAGE
    );
    conditionalValidation(
        props.eventEmptyOnClickAction === "microflow" && !props.eventEmptyOnClickMf,
        "Event: Empty",
        ACTION_MF
    );
    conditionalValidation(
        props.eventEmptyOnClickAction === "nanoflow" && !props.eventEmptyOnClickNf.nanoflow,
        "Event: Empty",
        ACTION_NF
    );

    return messages;
};
