import * as React from "react";

export interface FooterColumn { title: string; links: string[] }

/** Forest footer: wordmark, contact email, outlined social circles, lime column headings. */
export interface SiteFooterProps extends React.HTMLAttributes<HTMLElement> {
  email?: string;
  columns?: FooterColumn[];
  /** Lucide social slugs. The first is highlighted lime. */
  social?: string[];
}
export declare function SiteFooter(props: SiteFooterProps): JSX.Element;
