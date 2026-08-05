"use client";

import { useLinkStatus } from "next/link";
import { ChevronRight, Loader } from "./icons";

/**
 * The trailing chevron of a row link, swapped for a spinner while its navigation is in
 * flight. Must live inside the <Link> whose status it reports — `useLinkStatus` reads the
 * nearest ancestor link.
 */
export default function PendingChevron({
  size = 18,
  className = "shrink-0 text-ink-300",
}: {
  size?: number;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  if (pending) {
    return <Loader size={size} className={`pending-spinner ${className}`} />;
  }
  return <ChevronRight size={size} className={className} />;
}
