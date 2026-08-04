import * as React from "react";

/**
 * The Atlas payment card visual. Forest is the flagship finish; sage and cream are
 * the secondary and credit products.
 *
 * @startingPoint section="Brand" subtitle="Payment card in all three finishes" viewport="700x300"
 */
export interface BankCardProps extends React.HTMLAttributes<HTMLDivElement> {
  finish?: "forest" | "sage" | "cream";
  holder?: string;
  /** Network wordmark, e.g. "VISA" or "Mastercard". */
  network?: string;
  /** Card width in px; everything scales from 340 (aspect 1:0.63). */
  width?: number;
  /** Small round <img> of the holder. */
  avatar?: React.ReactNode;
  contactless?: boolean;
  chip?: boolean;
}
export declare function BankCard(props: BankCardProps): JSX.Element;
