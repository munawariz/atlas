"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "./icons";

export const PRIVACY_KEY = "ft_hide_amounts";

/**
 * Masks every amount inside a `.privacy-scope` by toggling `amounts-hidden` on <html>.
 *
 * The masking itself is pure CSS (globals.css §Privacy mode) so it applies before paint — this
 * button only flips the class and persists the choice. The root layout runs a blocking inline
 * script that reads the same key, so a reload never flashes the real numbers.
 */
export default function PrivacyToggle({
  className = "",
}: {
  className?: string;
}) {
  // Start false and correct in an effect: the server cannot know the client's preference, and
  // rendering the wrong icon briefly is harmless — the amounts themselves are already masked
  // by the pre-paint script.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(document.documentElement.classList.contains("amounts-hidden"));
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.documentElement.classList.toggle("amounts-hidden", next);
    try {
      if (next) localStorage.setItem(PRIVACY_KEY, "1");
      else localStorage.removeItem(PRIVACY_KEY);
    } catch {
      // Private-mode Safari throws on setItem. The class is already applied; losing the
      // preference across reloads is an acceptable degradation.
    }
  }

  const Glyph = hidden ? EyeOff : Eye;
  const label = hidden ? "Show amounts" : "Hide amounts";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${className}`}
    >
      <Glyph size={18} />
    </button>
  );
}
