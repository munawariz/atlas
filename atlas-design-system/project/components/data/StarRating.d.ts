import * as React from "react";

/** Store rating: optional big score, a forest star row, and a small grey caption. */
export interface StarRatingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Filled stars. */
  value?: number;
  max?: number;
  size?: number;
  /** Numeric score shown large to the left, e.g. "4.8". */
  score?: string;
  /** Small grey line under the stars, e.g. "Score on App Store". */
  caption?: string;
}
export declare function StarRating(props: StarRatingProps): JSX.Element;
