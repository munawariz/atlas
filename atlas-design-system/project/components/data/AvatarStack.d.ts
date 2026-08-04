import * as React from "react";

/** Overlapping avatar cluster with a cream count bubble — the social-proof unit. */
export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  people?: Array<{ src?: string; name?: string }>;
  size?: number;
  /** Trailing count, e.g. "5k+". */
  overflowLabel?: string;
}
export declare function AvatarStack(props: AvatarStackProps): JSX.Element;
