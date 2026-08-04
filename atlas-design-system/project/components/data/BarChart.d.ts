import * as React from "react";

export interface BarDatum { label: string; value: number; active?: boolean }

/** Column chart in the brand's two-tone treatment: forest bars against sage bars. */
export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data?: BarDatum[];
  height?: number;
  /** alternate = every other column forest (the brand look). datum = respect each item's `active`. */
  highlight?: "alternate" | "datum";
}
export declare function BarChart(props: BarChartProps): JSX.Element;
