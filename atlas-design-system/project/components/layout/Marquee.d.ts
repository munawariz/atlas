import * as React from "react";

/**
 * Full-bleed scrolling band of propositions on forest, separated by lime sparkles.
 *
 * @startingPoint section="Layout" subtitle="Full-bleed brand marquee band" viewport="700x120"
 */
export interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Short phrases in title case. Three to five reads best. */
  items?: string[];
  tone?: "forest" | "accent";
  /** Seconds for one loop. 32 is the brand default; slower for longer lists. */
  speed?: number;
  /** Type size in px. 30 at desktop, 20-22 on mobile. */
  size?: number;
}
export declare function Marquee(props: MarqueeProps): JSX.Element;
