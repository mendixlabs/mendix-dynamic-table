import { DynamicTableHelperProps } from "../../typings/DynamicTableProps";
import { createObject, commitObject } from "@jeltemx/mendix-react-widget-utils";

export interface CreateHelperProps extends DynamicTableHelperProps {
    contextGuid?: string | null;
    rowGuids?: string[];
    colGuids?: string[];
}

export const createHelperObject = async (props: CreateHelperProps): Promise<mendix.lib.MxObject | null> => {
    const {
        helperEntity,
        helperRowReference,
        helperColumnReference,
        helperContextReference,
        rowGuids,
        colGuids,
        contextGuid
    } = props;

    if (!helperEntity || !helperRowReference || !helperColumnReference) {
        window.mx.ui.error("Missing Helper entity and/or references");
        return null;
    }

    const helperObject = await createObject(helperEntity);

    if (rowGuids) {
        helperObject.addReferences(helperRowReference, rowGuids);
    }

    if (colGuids) {
        helperObject.addReferences(helperColumnReference, colGuids);
    }

    if (helperContextReference && contextGuid) {
        helperObject.addReference(helperContextReference, contextGuid);
    }

    // Allthough it's a non-persistent object, we still need to commit it to make sure it's available in the runtime
    await commitObject(helperObject);

    return helperObject;
};
