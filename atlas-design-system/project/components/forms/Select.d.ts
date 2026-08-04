import * as React from "react";

export interface SelectOption { value: string; label: string }

/** Native select in Atlas dress: 52px, 12px radius, chevron-down affordance. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<SelectOption | string>;
}
export declare function Select(props: SelectProps): JSX.Element;
