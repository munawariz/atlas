import * as React from "react";

export interface QuickAction { icon: string; label: string }

/** The app home screen's four-up action row: white rounded tiles with forest glyphs. */
export interface QuickActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  actions?: QuickAction[];
  onSelect?: (label: string) => void;
}
export declare function QuickActions(props: QuickActionsProps): JSX.Element;
