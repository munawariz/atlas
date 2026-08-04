import * as React from "react";

/** Eyebrow + display headline + optional supporting paragraph and trailing action. */
export interface SectionHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small uppercase kicker, e.g. "Our features". */
  eyebrow?: string;
  title?: React.ReactNode;
  body?: string;
  align?: "left" | "center";
  tone?: "light" | "inverse";
  size?: "display-2" | "display-3" | "display-4";
  /** Usually a Button, sits at the right on left-aligned headings. */
  action?: React.ReactNode;
}
export declare function SectionHeading(props: SectionHeadingProps): JSX.Element;
