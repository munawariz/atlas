import * as React from "react";

/** Small non-interactive status or category pill. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  tone?: "accent" | "soft" | "forest" | "sage" | "cream" | "positive" | "negative" | "warning";
  /** Lucide icon slug rendered before the label. */
  icon?: string;
  /** Uppercase + 0.12em tracking, for eyebrow-style badges. */
  uppercase?: boolean;
}
export declare function Badge(props: BadgeProps): JSX.Element;
