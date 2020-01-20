import { Component, createElement, ReactNode, CSSProperties } from "react";
import Mustache from "mustache";
import sanitizeHTML, { IOptions, defaults as sanizeDefaults } from "sanitize-html";

export type ComponentType = "div" | "span";

export interface TemplateComponentProps {
    template: string;
    data?: object;
    className?: string;
    style?: CSSProperties;
    type?: ComponentType;
    onClick?: () => void;
    onDblClick?: () => void;
}

export class TemplateComponent extends Component<TemplateComponentProps> {
    compile(template: string, data?: object): string {
        return Mustache.render(template, data);
    }

    render(): ReactNode {
        const { template, data, className, style, type, onClick, onDblClick } = this.props;

        if (!template) {
            return null;
        }

        const allowedAttributes = sanizeDefaults.allowedAttributes;

        allowedAttributes.img = ["src", "srcset"];
        allowedAttributes["*"] = ["class", "src", "style"];

        const sanitizeOptions: IOptions = {
            allowedTags: [...sanizeDefaults.allowedTags, "img"],
            allowedAttributes,
            selfClosing: sanizeDefaults.selfClosing,
            allowedSchemes: ["https", "mailto"],
            allowedSchemesByTag: {},
            allowedSchemesAppliedToAttributes: ["href", "src", "cite"],
            allowProtocolRelative: true
        };

        const __html = sanitizeHTML(this.compile(template, data), sanitizeOptions);

        if (type && type === "span") {
            return (
                <span
                    style={style}
                    className={className}
                    dangerouslySetInnerHTML={{ __html }}
                    onClick={onClick}
                    onDoubleClick={onDblClick}
                />
            );
        }

        return (
            <div
                style={style}
                className={className}
                dangerouslySetInnerHTML={{ __html }}
                onClick={onClick}
                onDoubleClick={onDblClick}
            />
        );
    }
}
