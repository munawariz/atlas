import * as React from "react";

export interface SegmentOption { value: string; label: string; icon?: string }

/** Two-to-three-way toggle in a sage trough; the selected segment is a white raised pill. */
export interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  options?: Array<SegmentOption | string>;
  value?: string;
  onChange?: (value: string) => void;
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element;
