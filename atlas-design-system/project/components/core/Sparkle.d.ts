import * as React from "react";

/** Atlas's four-point star ornament — marquee separator and headline punctuation. */
export interface SparkleProps extends React.SVGAttributes<SVGSVGElement> {
  /** Box size in px. 14-20 inline, 24-40 as a standalone accent. */
  size?: number;
  /** Fill colour. Lime on forest, forest on light. */
  color?: string;
}
export declare function Sparkle(props: SparkleProps): JSX.Element;
