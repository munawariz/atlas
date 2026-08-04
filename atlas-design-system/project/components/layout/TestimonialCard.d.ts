import * as React from "react";

/** Customer quote on a tinted ground: forest quote glyph, quote, em-dashed attribution. */
export interface TestimonialCardProps extends React.HTMLAttributes<HTMLElement> {
  quote?: React.ReactNode;
  author?: string;
  role?: string;
  tone?: "cream" | "sage" | "white";
}
export declare function TestimonialCard(props: TestimonialCardProps): JSX.Element;
