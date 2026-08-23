/**
 * Loading states, drawn from the thing the shop actually sells.
 *
 * The loader is a loom: vertical warp threads in ink, one weft thread in clay
 * being drawn through them. Weaving is what most of the catalogue *is* — kans
 * grass, pater reed — so the wait state carries the brand instead of importing
 * a spinner from nowhere. The skeletons are unbleached paper blocks with a slow
 * light-sweep, cut to the same proportions as the content they stand in for.
 *
 * Server-safe: no state, no effects. All motion is CSS (`globals.css`, "looms
 * and skeletons" section) and dies under `prefers-reduced-motion`.
 */

const SIZES = {
  sm: { width: 28, height: 20 },
  md: { width: 44, height: 32 },
  lg: { width: 64, height: 46 },
} as const;

/**
 * The weaving loader. The weft path snakes over and under five warp threads;
 * stroke-dash animation draws it through, rests, and draws again.
 */
export function Loom({
  size = "md",
  label,
  className = "",
}: {
  size?: keyof typeof SIZES;
  /** Announced to screen readers. Omit only when a sibling already says it. */
  label?: string;
  className?: string;
}) {
  const { width, height } = SIZES[size];
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <svg
        viewBox="0 0 44 32"
        width={width}
        height={height}
        fill="none"
        aria-hidden="true"
        className="loom"
      >
        {/* Warp: five standing threads. Each lifts slightly, in order, as the
            weft passes — the loom breathing rather than a machine spinning. */}
        {[6, 14, 22, 30, 38].map((x, index) => (
          <line
            key={x}
            x1={x}
            y1={3}
            x2={x}
            y2={29}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="loom-warp"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
        {/* Weft: one clay thread woven over-under-over-under-over. */}
        <path
          d="M1 16 C 4 16, 4 11, 6 11 S 9 16, 11 16 S 13 21, 15 21 S 17 16, 19 16 S 21 11, 23 11 S 25 16, 27 16 S 29 21, 31 21 S 33 16, 35 16 S 37 11, 39 11 S 42 16, 43 16"
          stroke="var(--color-clay)"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="loom-weft"
        />
      </svg>
      {label ? <span className="spec">{label}</span> : null}
    </span>
  );
}

/**
 * A full-height centred loader for a region that is genuinely empty while it
 * waits — an admin screen mid-navigation, a panel refetching.
 */
export function LoomField({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Loom size="lg" label={label} />
    </div>
  );
}

/* ------------------------------------------------------------- skeletons -- */

/**
 * One rectangle of not-yet paper. Compose these into the shape of the content
 * they stand in for; never leave one on screen without motion, or it reads as
 * broken rather than loading.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

/** A run of text lines, the last one short the way real prose ends. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`block space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={`h-3.5 ${index === lines - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </span>
  );
}

/** The stand-in for a product card: 4:5 plate, name line, price line. */
export function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-4/5 w-full" />
      <Skeleton className="mt-4 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-2 h-3.5 w-1/4" />
    </div>
  );
}

/** A grid of card stand-ins, matching `ProductGrid`'s breakpoints. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 lg:gap-x-8"
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/** Table rows for the console: a header band and striped line rows. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-sm border border-rule bg-surface">
      <Skeleton className="h-9 w-full rounded-none" />
      <div className="space-y-0">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-t border-rule px-3 py-2.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
