import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<Variant, string> = {
  // The clay accent earns its ~5% of the screen here and on price.
  primary: "bg-clay text-paper hover:bg-[#9d4826]",
  secondary: "border border-rule-strong text-ink hover:border-ink hover:bg-paper-deep",
  quiet: "text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-clay hover:decoration-clay",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

function classesFor(variant: Variant, size: Size, extra?: string) {
  const shape = variant === "quiet" ? "" : "rounded-sm";
  return [base, shape, variants[variant], variant === "quiet" ? "" : sizes[size], extra]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classesFor(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={classesFor(variant, size, className)} {...props} />;
}
