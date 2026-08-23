"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "./ui";

/**
 * Every admin mutation goes through here: one form, one Server Action, one
 * place that renders the human error the database handed back. Nothing else in
 * the console is a client component.
 */

export type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const styles = {
  primary: "bg-clay text-paper hover:bg-[#9d4826] border border-clay",
  secondary: "border border-rule-strong text-ink hover:border-ink hover:bg-paper-deep",
  danger: "border border-bad text-bad hover:bg-bad-soft",
};

function Submit({
  label,
  variant = "secondary",
  size = "sm",
}: {
  label: string;
  variant?: keyof typeof styles;
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${styles[variant]}`}
    >
      {pending ? "Working…" : label}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  submitLabel,
  variant = "secondary",
  size = "sm",
  confirm,
  className = "",
  compact = false,
  footer,
}: {
  action: Action;
  children?: ReactNode;
  submitLabel: string;
  variant?: keyof typeof styles;
  size?: "sm" | "md";
  /** Native confirm() for destructive actions. Skipped when absent. */
  confirm?: string;
  className?: string;
  /**
   * Drops the gap above the button. For the one-button forms that sit inline in
   * a row of controls — a reorder arrow, a show/hide toggle — where the default
   * spacing pushes the button out of line with everything beside it.
   */
  compact?: boolean;
  footer?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "mt-2"}`}>
        <Submit label={submitLabel} variant={variant} size={size} />
        {footer}
        {state?.error ? (
          <p role="alert" className="text-sm font-medium text-bad">
            {state.error}
          </p>
        ) : null}
        {state?.ok ? (
          <p role="status" className="text-sm text-ok">
            {state.ok}
          </p>
        ) : null}
      </div>
    </form>
  );
}
