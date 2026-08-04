import * as React from "react";

/**
 * Atlas button. Forest is the default action, lime is the one high-emphasis CTA
 * (never two limes in a view), pill shape is reserved for navigation-level actions.
 *
 * @startingPoint section="Core" subtitle="Button variants, sizes and states" viewport="700x300"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: "primary" | "accent" | "outline" | "ghost" | "inverse" | "outline-inverse";
  size?: "sm" | "md" | "lg";
  /** rounded = 10px (default). pill = fully round, for header/nav CTAs only. */
  shape?: "rounded" | "pill";
  /** Lucide icon slug. */
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  disabled?: boolean;
}
export declare function Button(props: ButtonProps): JSX.Element;
