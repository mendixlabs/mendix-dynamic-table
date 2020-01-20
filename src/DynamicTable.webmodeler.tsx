import { Component, ReactNode, createElement } from "react";
import { DynamicTableContainerProps } from "../typings/DynamicTableProps";

declare function require(name: string): string;

export class preview extends Component<DynamicTableContainerProps> {
    render(): ReactNode {
        return <div>No preview available for Dynamic Table</div>;
    }

    // private transformProps(props: DynamicTableContainerProps): DynamicTreeTableContainerProps {
    //     return {};
    // }
}

export function getPreviewCss(): string {
    return require("./ui/DynamicTable.scss");
}
