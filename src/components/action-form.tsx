"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";

export type ServerAction = (
  state: ActionState,
  formData: FormData
) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && (
        <p className="mt-1.5 text-xs font-medium text-alert">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-1.5 text-xs font-medium text-mint">{state.success}</p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  pendingText,
}: {
  children: ReactNode;
  className: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingText ?? "...") : children}
    </button>
  );
}
