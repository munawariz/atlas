import * as React from "react";

/**
 * The feature-grid unit: lime icon chip, tight title, grey body, and usually a
 * cropped app screenshot or card bleeding off the bottom edge.
 *
 * @startingPoint section="Layout" subtitle="Feature tile with lime icon chip" viewport="700x380"
 */
export interface FeatureTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide slug for the chip glyph. */
  icon?: string;
  title?: React.ReactNode;
  body?: string;
  tone?: "cream" | "sage" | "forest" | "white";
  /** Padding in px. 32 default, 40 for the wide tiles. */
  pad?: number;
  /** A Button, placed under the copy. */
  action?: React.ReactNode;
  /** Cropped visual content — screenshots, cards, phone frames. */
  children?: React.ReactNode;
}
export declare function FeatureTile(props: FeatureTileProps): JSX.Element;
