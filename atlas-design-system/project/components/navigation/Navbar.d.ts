import * as React from "react";

/**
 * Marketing header: wordmark left, uppercase link row centre, pill CTA right.
 *
 * @startingPoint section="Navigation" subtitle="Marketing site header" viewport="1280x110"
 */
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Link labels, written in Title Case and rendered uppercase. */
  links?: string[];
  activeIndex?: number;
  tone?: "light" | "inverse";
  cta?: string;
  onNavigate?: (label: string, index: number) => void;
  onCta?: () => void;
}
export declare function Navbar(props: NavbarProps): JSX.Element;
