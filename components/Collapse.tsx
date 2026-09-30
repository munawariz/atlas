"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A panel that slides open and closed instead of popping in and out — the React-state
 * counterpart of what DetailsMotion does for `<details>`.
 *
 * Replaces `{open && <div>…</div>}`: the content mounts on open, animates its height (a
 * `grid-template-rows: 0fr → 1fr` transition, which Safari animates too) and fades in; on close
 * it animates back and only then unmounts, so a form inside still resets the way it did when
 * it was conditionally rendered. While closing it is `inert`, so nothing in it takes a tap.
 */

/** How long opening or closing takes — the `.slide-panel` transition in globals.css. */
export const COLLAPSE_MS = 260;
/** Unmount once the close has run, with a little slack for the last frame. */
const CLOSE_MS = COLLAPSE_MS + 40;

export default function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  /** Classes for the content box — margins and padding belong here, not outside. */
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const frame = useRef<number | null>(null);
  // Mount in the same render that opens, so the content (and a field to focus) exists at once.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      // Mounted collapsed; expand on the next frame so the transition has a start.
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(() => setExpanded(true));
      });
      return () => {
        if (frame.current != null) cancelAnimationFrame(frame.current);
      };
    }
    setExpanded(false);
    const timer = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="slide-panel" data-open={expanded} inert={!open}>
      <div className="slide-panel-inner">
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
