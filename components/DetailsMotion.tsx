"use client";

import { useEffect } from "react";

/**
 * Animates every `<details>` in the app open and closed.
 *
 * A native `<details>` snaps: its content appears or vanishes in one frame. The CSS fix
 * (`::details-content` + `interpolate-size`) is Chromium-only, and this is a phone app, so iOS
 * Safari would keep snapping. Instead, one document-level listener takes over the summary
 * click and runs the height change through the Web Animations API — so the twenty-odd
 * server-rendered `<details>` across the app animate without any of them changing, and a new
 * one gets it for free.
 *
 * Opting out: `data-no-motion` on the `<details>`. Reduced motion: the native toggle is left
 * alone, exactly as before.
 */

const DURATION = 260;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)"; // --ease-standard

const running = new WeakMap<HTMLDetailsElement, { animation: Animation; opening: boolean }>();

/** The element's height with `open` set as given, measured without a paint in between. */
function heightWhen(details: HTMLDetailsElement, open: boolean): number {
  const wasOpen = details.open;
  const height = details.style.height;
  details.open = open;
  details.style.height = "auto";
  const measured = details.getBoundingClientRect().height;
  details.open = wasOpen;
  details.style.height = height;
  return measured;
}

function toggle(details: HTMLDetailsElement) {
  const current = running.get(details);
  // A tap mid-animation reverses it, from wherever it has got to.
  const opening = current ? !current.opening : !details.open;
  const start = details.getBoundingClientRect().height;
  current?.animation.cancel();

  const end = heightWhen(details, opening);
  details.style.overflow = "hidden";
  // The chevron turns with the tap rather than at the end of a close.
  details.classList.toggle("is-closing", !opening);
  if (opening) details.open = true;

  const animation = details.animate(
    { height: [`${start}px`, `${end}px`] },
    { duration: DURATION, easing: EASING }
  );
  running.set(details, { animation, opening });

  animation.onfinish = () => {
    if (!opening) details.open = false;
    details.classList.remove("is-closing");
    details.style.overflow = "";
    running.delete(details);
  };
}

export default function DetailsMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || reduced.matches) return;
      const target = event.target as Element | null;
      const summary = target?.closest("summary");
      const details = summary?.parentElement;
      if (!summary || !(details instanceof HTMLDetailsElement)) return;
      if (details.hasAttribute("data-no-motion")) return;
      // A link or control inside the summary does its own thing.
      const control = target?.closest("a, button, input, select, textarea, label");
      if (control && summary.contains(control) && control !== summary) return;

      event.preventDefault();
      toggle(details);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
