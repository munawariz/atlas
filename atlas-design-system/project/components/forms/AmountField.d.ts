import * as React from "react";

/** Money input with an inline currency picker — the send-money flow's main control. */
export interface AmountFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small grey caption above the figure, e.g. "Amount to send". */
  label?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  currency?: string;
  currencies?: string[];
  onCurrencyChange?: () => void;
  /** Flag node (an <img>, not an emoji). */
  flag?: React.ReactNode;
  readOnly?: boolean;
}
export declare function AmountField(props: AmountFieldProps): JSX.Element;
