import * as React from "react";

/** Square-or-circle icon-only control: play buttons, card corner arrows, app quick actions. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon slug. */
  icon?: string;
  tone?: "forest" | "accent" | "sage" | "white" | "outline" | "outline-inverse";
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  /** Accessible label — required in practice. */
  label?: string;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
