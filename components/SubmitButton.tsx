"use client";

import { useFormStatus } from "react-dom";

// A submit <button> that automatically disables + dims while its form's server action
// is in flight, so the click is acknowledged instantly even on a slow round-trip.
// Drop it into any <form action={serverAction}> in place of a plain <button>.
export default function SubmitButton({
  children,
  pendingText,
  className = "",
  label,
}: {
  children: React.ReactNode;
  pendingText?: React.ReactNode;
  className?: string;
  label?: string; // accessible name + tooltip (use for icon-only buttons)
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={label}
      title={label}
      className={`${className} transition-opacity disabled:opacity-50`}
    >
      {pending ? pendingText ?? children : children}
    </button>
  );
}
