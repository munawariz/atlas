"use client";

import FormSheet from "@/components/FormSheet";
import type { PaylaterProvider } from "@/lib/types";
import AddInstallmentForm from "./AddInstallmentForm";

/**
 * Thin client wrapper so the server page can hand `FormSheet` a render-prop child — the
 * `close` callback cannot cross the server/client boundary as a serialized prop.
 */
export default function AddInstallmentSheet({
  providers,
  defaultMonth,
}: {
  providers: PaylaterProvider[];
  defaultMonth: string;
}) {
  return (
    <FormSheet triggerLabel="Add an installment" title="Add an installment">
      {(close) => (
        <AddInstallmentForm
          providers={providers}
          defaultMonth={defaultMonth}
          onSaved={close}
        />
      )}
    </FormSheet>
  );
}
