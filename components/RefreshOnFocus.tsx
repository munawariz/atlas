"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the server component data whenever this screen is shown or the tab
 * regains focus, so the dashboard always reflects the latest transactions.
 */
export default function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    router.refresh(); // fresh on every mount/navigation to this page
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);
  return null;
}
