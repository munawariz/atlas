import * as React from "react";

/** Big display figure over a small bold caption — the hero's proof numbers. */
export interface StatBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: React.ReactNode;
  label?: React.ReactNode;
  size?: "lg" | "md" | "sm";
  tone?: "light" | "inverse";
}
export declare function StatBlock(props: StatBlockProps): JSX.Element;
