import { copy } from "@/content/copy";

/** Same two-column skeleton as the page, so nothing jumps when data lands. */
export default function Loading() {
  return (
    <div className="container-page pt-8 lg:pt-12" aria-busy="true" aria-label={copy.a11y.loading}>
      <div className="h-3 w-64 bg-paper-deep" />
      <div className="mt-6 grid items-start gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div>
          <div className="aspect-4/5 w-full bg-paper-deep" />
          <div className="mt-4 hidden gap-2 md:flex">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-4/5 w-16 bg-paper-deep" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-3 w-40 bg-paper-deep" />
          <div className="mt-4 h-9 w-3/4 bg-paper-deep" />
          <div className="mt-3 h-5 w-1/2 bg-paper-deep" />
          <div className="mt-6 h-7 w-32 bg-paper-deep" />
          <div className="mt-8 h-12 w-full bg-paper-deep" />
          <div className="mt-8 h-44 w-full border border-rule" />
        </div>
      </div>
    </div>
  );
}
