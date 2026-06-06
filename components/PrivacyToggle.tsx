"use client";

import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

const KEY = "ft_hide_amounts";

// Toggles a privacy class on <html>; CSS masks amounts (dots) inside `.privacy-scope`.
// A no-flash script in the root layout applies the class before paint.
export default function PrivacyToggle() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(document.documentElement.classList.contains("amounts-hidden"));
  }, []);

  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    document.documentElement.classList.toggle("amounts-hidden", next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-line/60 bg-ink-2/70 text-paper-dim transition-colors active:text-paper"
    >
      {hidden ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
    </button>
  );
}
