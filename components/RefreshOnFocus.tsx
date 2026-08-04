"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the current server-rendered page on mount and whenever the tab regains focus.
 *
 * Installed as a PWA, Atlas is rarely reloaded — it is resumed. Without this, a dashboard left
 * open overnight still shows yesterday's balances and a stale live stock price.
 */
export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();

    const onFocus = () => router.refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
