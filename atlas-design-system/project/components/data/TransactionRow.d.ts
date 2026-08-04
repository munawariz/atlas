import * as React from "react";

/** One line of money movement: icon chip, title, meta line, signed amount. */
export interface TransactionRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  /** Date, merchant or status line under the title. */
  meta?: string;
  /** Pre-formatted, sign included, e.g. "+288.00" or "-$120.30". */
  amount?: string;
  /** in = green amount, out = near-black amount. */
  direction?: "in" | "out";
  /** Lucide slug for the chip glyph. */
  icon?: string;
  /** Round <img> replacing the icon chip (person-to-person payments). */
  avatar?: React.ReactNode;
  chipTone?: "cream" | "sage" | "lime";
  chevron?: boolean;
}
export declare function TransactionRow(props: TransactionRowProps): JSX.Element;
