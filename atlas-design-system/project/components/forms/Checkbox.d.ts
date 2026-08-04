import * as React from "react";

/** 22px checkbox, 6px radius. Checked = forest fill with a lime tick. */
export interface CheckboxProps extends React.HTMLAttributes<HTMLLabelElement> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: string;
  description?: string;
  disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
