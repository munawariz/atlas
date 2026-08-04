import * as React from "react";

/** 48x28 toggle. Off = sage track, white knob. On = forest track, lime knob. */
export interface SwitchProps extends React.HTMLAttributes<HTMLLabelElement> {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}
export declare function Switch(props: SwitchProps): JSX.Element;
