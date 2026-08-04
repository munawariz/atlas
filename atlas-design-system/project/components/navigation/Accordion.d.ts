import * as React from "react";

export interface AccordionItem { title: string; body?: string }

/**
 * Numbered disclosure list — the "how it works" pattern. One panel open at a time.
 *
 * @startingPoint section="Navigation" subtitle="Numbered how-it-works accordion" viewport="700x360"
 */
export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: AccordionItem[];
  /** Index open on mount; -1 for all closed. */
  defaultOpen?: number;
  /** inverse = on forest (the brand default). light = on white/cream. */
  tone?: "inverse" | "light";
  /** Show the 01, 02, 03 counters. */
  numbered?: boolean;
}
export declare function Accordion(props: AccordionProps): JSX.Element;
