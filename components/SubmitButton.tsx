"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  children: ReactNode;
  /** Sets both aria-label and title — required for icon-only buttons. */
  label?: string;
  className?: string;
  /** Swapped in while the form action is in flight. Falls back to `children`. */
  pendingChildren?: ReactNode;
  disabled?: boolean;
  name?: string;
  value?: string;
}

/**
 * A submit button that disables and dims itself while its form's action is in flight.
 *
 * `useFormStatus` only reports the status of the nearest ancestor <form>, so this must be
 * rendered inside the form it submits — never as the form itself.
 */
export default function SubmitButton({
  children,
  label,
  className = "btn btn-primary w-full",
  pendingChildren,
  disabled,
  name,
  value,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-label={label}
      title={label}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? (pendingChildren ?? children) : children}
    </button>
  );
}
