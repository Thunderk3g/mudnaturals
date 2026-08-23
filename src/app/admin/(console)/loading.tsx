import { Loom, Skeleton, SkeletonRows } from "@/components/loaders";

/**
 * The only `loading.tsx` in this application. Keep it that way.
 *
 * A route-level `loading.tsx` opens a Suspense boundary, and a Suspense
 * boundary makes Next stream the response — which commits the HTTP status
 * *before* the page body runs. Any `notFound()` thrown after that point cannot
 * change the status any more, so every 404 on the storefront goes out as a
 * 200. Search engines then index the not-found page. We shipped that bug once;
 * this file is the one place where it cannot bite:
 *
 *   - everything under `(console)` is behind a session, so robots never see it;
 *   - the console is `force-dynamic` and reads a database in Seoul, so a
 *     navigation here has real dead time worth filling;
 *   - nothing under `(console)` calls `notFound()` for a *public* URL.
 *
 * If a storefront route feels slow, put a `<Suspense>` around the slow part
 * inside the page instead — that keeps the status code under the page's
 * control. Do not add another `loading.tsx`.
 *
 * The shape below mirrors `PageHeader` + a table screen, negative margins and
 * all, so the real page lands on top of its own outline rather than replacing
 * a different layout.
 */
export default function ConsoleLoading() {
  return (
    <div>
      <div className="-mx-5 mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule-strong bg-paper-deep/92 px-5 py-3 lg:-mx-8 lg:px-8">
        <div className="min-w-0">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="mt-2 h-6 w-56" />
        </div>
        <Loom size="sm" label="Loading…" />
      </div>

      <div className="rounded-sm border border-rule bg-paper-deep p-3">
        <SkeletonRows />
      </div>
    </div>
  );
}
