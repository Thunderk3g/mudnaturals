import Link from "next/link";
import type { ReactNode } from "react";

/** A page band. Section air stays generous on mobile — cramped mobile is where
 *  premium brands lose the illusion. */
export function Section({
  children,
  className = "",
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <section className={`${tight ? "py-14 lg:py-20" : "py-20 lg:py-30"} ${className}`}>
      <div className="container-page">{children}</div>
    </section>
  );
}

/** Eyebrow in the mono specimen register, serif title, optional trailing link. */
export function SectionHeader({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b border-rule pb-5">
      <div className="max-w-2xl">
        {eyebrow ? <p className="spec mb-3">{eyebrow}</p> : null}
        <h2 className="text-3xl lg:text-4xl">{title}</h2>
        {body ? <p className="mt-3 text-ink-2">{body}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="spec whitespace-nowrap text-ink hover:text-clay"
        >
          {action.label} →
        </Link>
      ) : null}
    </header>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`rule ${className}`} />;
}

/** Long-form body copy: measure held near 65 characters. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`max-w-[65ch] space-y-5 text-[1.0625rem] leading-relaxed text-ink-2 ${className}`}>
      {children}
    </div>
  );
}

export function Breadcrumb({ trail }: { trail: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="spec flex flex-wrap items-center gap-2">
      {trail.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2">
          {i > 0 ? <span aria-hidden className="text-rule-strong">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-clay">{item.label}</Link>
          ) : (
            <span className="text-ink-2">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-rule-strong px-8 py-16 text-center">
      <h3 className="text-xl">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-md text-ink-2">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
