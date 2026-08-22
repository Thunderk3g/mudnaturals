import { copy } from "@/content/copy";

/** Paper-toned placeholder blocks. No spinner — the catalogue never fidgets. */
export default function Loading() {
  return (
    <div className="container-page py-16 lg:py-24" aria-busy="true" aria-live="polite">
      <span className="sr-only">{copy.a11y.loading}</span>
      <div className="grid grid-cols-12 items-center gap-x-8 gap-y-10">
        <div className="col-span-12 lg:col-span-5">
          <div className="h-3 w-32 bg-paper-deep" />
          <div className="mt-6 h-10 w-full bg-paper-deep" />
          <div className="mt-3 h-10 w-4/5 bg-paper-deep" />
          <div className="mt-8 h-3 w-full bg-paper-deep" />
          <div className="mt-3 h-3 w-3/4 bg-paper-deep" />
        </div>
        <div className="col-span-12 aspect-4/5 bg-paper-deep lg:col-span-6 lg:col-start-7" />
      </div>

      <div className="mt-20 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-3 lg:gap-x-8">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="aspect-4/5 bg-paper-deep" />
            <div className="mt-4 h-2.5 w-24 bg-paper-deep" />
            <div className="mt-3 h-4 w-3/4 bg-paper-deep" />
          </div>
        ))}
      </div>
    </div>
  );
}
