import * as React from "react";

/** Selectable filter pill — the app's This day / This week / This month row. */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  /** inverse for use on forest grounds. */
  tone?: "light" | "inverse";
}
export declare function Chip(props: ChipProps): JSX.Element;
