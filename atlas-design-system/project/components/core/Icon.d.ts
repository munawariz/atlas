import * as React from "react";

/**
 * Atlas outline glyph, rendered inline as SVG (no network request) so it survives
 * screenshot and PDF export. Set from Lucide, vendored — see readme > ICONOGRAPHY.
 */
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  /** Icon slug, e.g. "wallet", "arrow-up-right", "chart-line". See ICON_NAMES. */
  name?: string;
  /** Box size in px. Atlas uses 16 / 18 / 20 / 22 / 26. */
  size?: number;
  /** Stroke colour. Defaults to currentColor. */
  color?: string;
  /** Accessible name. Omit for decorative icons. */
  label?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
/** Every slug available in the vendored set. */
export declare const ICON_NAMES: string[];
