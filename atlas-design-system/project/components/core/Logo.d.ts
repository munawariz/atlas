import * as React from "react";

/** The Atlas wordmark. No logo asset exists yet — this is type, set tight. */
export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Cap height in px. 22-28 in navigation, 40+ in hero/footer lockups. */
  size?: number;
  /** forest on light grounds, inverse on forest, accent for lime-on-forest. */
  tone?: "forest" | "inverse" | "accent";
}
export declare function Logo(props: LogoProps): JSX.Element;
