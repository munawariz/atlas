import * as React from "react";

/** Phone shell with a forest bezel and a minimal status bar, for app screens inside marketing layouts. */
export interface PhoneFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  /** Outer width in px; everything inside scales from 300. */
  width?: number;
  bezel?: "forest" | "sage" | "ink";
  statusBar?: boolean;
  time?: string;
}
export declare function PhoneFrame(props: PhoneFrameProps): JSX.Element;
