import * as React from "react";

/** 22px radio; checked = forest dot inside a forest ring. */
export interface RadioProps extends React.HTMLAttributes<HTMLLabelElement> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: string;
  value?: string;
  name?: string;
  disabled?: boolean;
}
export declare function Radio(props: RadioProps): JSX.Element;
