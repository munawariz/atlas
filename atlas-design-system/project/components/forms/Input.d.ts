import * as React from "react";

/** Single-line text input, 52px tall, 12px radius, hairline border that goes forest on focus. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Lucide icon slug shown at the leading edge. */
  icon?: string;
  /** Static trailing text, e.g. a currency code or unit. */
  suffix?: React.ReactNode;
  invalid?: boolean;
}
export declare function Input(props: InputProps): JSX.Element;
