import type { ReactNode } from "react";
import Link from "next/link";
import { formatNpr } from "@/lib/money";

/**
 * Internal-tool primitives. Same palette as the storefront so it feels like one
 * system, but tuned for scanning: dense rows, sticky heads, tabular numerals,
 * and status encoded as colour *and* text so it survives a greyscale print or
 * a colour-blind reader.
 *
 * No "use client" and no "server-only" here on purpose — both sides import it.
 */

export type ActionState = { error?: string; ok?: string } | null;

/* ------------------------------------------------------------------ table -- */

export const th =
  "sticky top-0 z-10 bg-paper-deep px-3 py-2 text-left align-bottom spec whitespace-nowrap " +
  "border-b border-rule-strong";
export const td = "px-3 py-2 align-top border-b border-rule";
export const numCell = `${td} text-right font-mono tabular-nums whitespace-nowrap`;

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[48rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

/* ------------------------------------------------------------------ pills -- */

type Tone = "neutral" | "ok" | "warn" | "bad" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-paper-deep text-ink-2 border-rule-strong",
  ok: "bg-ok-soft text-ok border-ok",
  warn: "bg-warn-soft text-warn border-warn",
  bad: "bg-bad-soft text-bad border-bad",
  info: "bg-clay-soft text-clay border-clay",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const ORDER_TONES: Record<string, Tone> = {
  pending_payment: "warn",
  payment_verifying: "warn",
  manual_review: "bad",
  paid: "ok",
  confirmed: "ok",
  packed: "info",
  shipped: "info",
  delivered: "ok",
  cancelled: "neutral",
  refunded: "bad",
  partially_refunded: "bad",
  expired: "neutral",
  failed: "bad",
  refused: "bad",
};

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={ORDER_TONES[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Pill>;
}

const ATTEMPT_TONES: Record<string, Tone> = {
  initiated: "warn",
  pending: "warn",
  ambiguous: "bad",
  succeeded: "ok",
  failed: "bad",
  expired: "neutral",
  canceled: "neutral",
  refunded: "bad",
  partially_refunded: "bad",
};

export function AttemptPill({ status }: { status: string }) {
  return <Pill tone={ATTEMPT_TONES[status] ?? "neutral"}>{status}</Pill>;
}

export function PublishPill({ status }: { status: string }) {
  const tone: Tone = status === "published" ? "ok" : status === "archived" ? "neutral" : "warn";
  return <Pill tone={tone}>{status}</Pill>;
}

/* ----------------------------------------------------------------- money --- */

export function Money({ paisa, muted = false }: { paisa: number | null | undefined; muted?: boolean }) {
  return (
    <span className={`font-mono tabular-nums ${muted ? "text-ink-2" : ""}`}>
      {paisa == null ? "—" : formatNpr(paisa)}
    </span>
  );
}

export function Num({ value }: { value: number | string | null | undefined }) {
  return <span className="font-mono tabular-nums">{value ?? "—"}</span>;
}

/** Timestamps are shown in Kathmandu time — the only clock the team works in. */
export function When({ value, time = true }: { value: string | Date | null | undefined; time?: boolean }) {
  if (!value) return <span className="text-ink-3">—</span>;
  const d = new Date(value);
  const text = d.toLocaleString("en-GB", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
  return (
    <time dateTime={d.toISOString()} className="font-mono tabular-nums text-xs whitespace-nowrap">
      {text}
    </time>
  );
}

/* ------------------------------------------------------------------ shell -- */

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule-strong pb-3">
      <div>
        <h1 className="font-sans text-xl font-semibold tracking-tight">{title}</h1>
        {meta ? <div className="mt-1 text-sm text-ink-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-rule bg-surface ${className}`}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b border-rule px-3 py-2">
          <h2 className="spec text-ink">{title}</h2>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  href?: string;
  tone?: Tone;
}) {
  const accent = tone === "neutral" ? "" : tones[tone].split(" ")[1];
  const body = (
    <>
      <div className="spec">{label}</div>
      <div className={`mt-1 font-mono text-2xl tabular-nums tracking-tight ${accent}`}>{value}</div>
    </>
  );
  return href ? (
    <Link href={href} className="block border border-rule bg-surface px-3 py-3 hover:border-ink">
      {body}
    </Link>
  ) : (
    <div className="border border-rule bg-surface px-3 py-3">{body}</div>
  );
}

export function Note({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  return (
    <p className={`border px-3 py-2 text-sm ${tones[tone]} [&_a]:underline`}>{children}</p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-8 text-center text-sm text-ink-2">{children}</p>;
}

/* ----------------------------------------------------------------- fields -- */

const control =
  "w-full border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none disabled:bg-paper-deep disabled:text-ink-3";

export function Field({
  label,
  name,
  hint,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string; className?: string }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="spec mb-1 block text-ink">
        {label}
        {props.required ? <span className="text-clay"> *</span> : null}
      </label>
      <input id={id} name={name} className={control} {...props} />
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label,
  name,
  hint,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; hint?: string; className?: string }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="spec mb-1 block text-ink">
        {label}
      </label>
      <textarea id={id} name={name} rows={props.rows ?? 4} className={control} {...props} />
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function Select({
  label,
  name,
  hint,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; hint?: string; className?: string }) {
  const id = `f-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="spec mb-1 block text-ink">
        {label}
        {props.required ? <span className="text-clay"> *</span> : null}
      </label>
      <select id={id} name={name} className={control} {...props}>
        {children}
      </select>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

export function Check({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const id = `f-${name}`;
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input id={id} name={name} type="checkbox" className="h-4 w-4 accent-[#b4552d]" {...props} />
      {label}
    </label>
  );
}
