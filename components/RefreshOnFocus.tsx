"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current server-rendered page whenever the tab regains focus.
 *
 * Installed as a PWA, Atlas is rarely reloaded — it is resumed. Without this, a dashboard left
 * open overnight still shows yesterday's balances and a stale live stock price. No refresh on
 * mount: every page is force-dynamic, so mounting means the data is milliseconds old already.
 * Refreshes are throttled — rapid tab-switching must not stack full server renders.
 */
const THROTTLE_MS = 15_000;

export default function RefreshOnFocus() {
  const router = useRouter();
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const refresh = () => {
      if (Date.now() - lastRefresh.current < THROTTLE_MS) return;
      lastRefresh.current = Date.now();
      router.refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
