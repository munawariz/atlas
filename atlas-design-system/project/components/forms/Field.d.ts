import * as React from "react";

/** Label + hint/error wrapper shared by Atlas form controls. */
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  hint?: string;
  /** When set, replaces the hint and turns it red. */
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
}
export declare function Field(props: FieldProps): JSX.Element;
