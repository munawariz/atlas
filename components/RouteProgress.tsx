"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin lime bar across the top of the viewport while a navigation is in flight.
 *
 * The App Router has no navigation events, so the start signal is a captured click on any
 * same-origin link (plus popstate for the back gesture); the finish signal is the pathname
 * or search params actually changing. A safety timeout clears the bar if a click never
 * turns into a navigation (link to the current page, prevented default, failed fetch).
 */

type Phase = "idle" | "active" | "done";

function Bar() {
  const [phase, setPhase] = useState<Phase>("idle");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The route committed — run the bar to 100% and fade it out.
  useEffect(() => {
    if (safetyRef.current) clearTimeout(safetyRef.current);
    setPhase((p) => (p === "active" ? "done" : p));
  }, [pathname, searchParams]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 400);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    function start() {
      if (safetyRef.current) clearTimeout(safetyRef.current);
      safetyRef.current = setTimeout(() => setPhase("idle"), 8000);
      setPhase("active");
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      // A link to the page we are already on never commits, so it must never start the bar.
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    }

    function onPop() {
      start();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      if (safetyRef.current) clearTimeout(safetyRef.current);
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-[60]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className={`h-[3px] bg-lime-500 ${
          phase === "active" ? "route-progress-active" : "route-progress-done"
        }`}
      />
    </div>
  );
}

export default function RouteProgress() {
  // useSearchParams demands a Suspense boundary; the fallback is simply no bar yet.
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
