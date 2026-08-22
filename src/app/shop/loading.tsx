import { Section } from "@/components/ui/layout";
import { shopCopy } from "@/content/shop-copy";

/**
 * A held layout, not a shimmer. The motion budget is one `.rise` on the real
 * content — a pulsing skeleton would spend it twice.
 */
export default function ShopLoading() {
  return (
    <Section>
      <div role="status" aria-busy="true">
        <span className="sr-only">{shopCopy.loading}</span>

        <div className="h-3 w-40 bg-paper-deep" />
        <div className="mt-8 h-10 w-72 bg-paper-deep" />
        <div className="mt-4 h-4 w-full max-w-xl bg-paper-deep" />

        <div className="mt-12 gap-x-12 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start">
          <div className="hidden space-y-8 lg:block">
            {[0, 1, 2].map((group) => (
              <div key={group}>
                <div className="h-3 w-24 border-b border-rule pb-2" />
                <div className="mt-4 space-y-3">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="h-3 w-full bg-paper-deep" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 lg:mt-0">
            <div className="flex items-center justify-between border-b border-rule pb-4">
              <div className="h-3 w-24 bg-paper-deep" />
              <div className="h-3 w-40 bg-paper-deep" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-3 lg:gap-x-8">
              {[0, 1, 2, 3, 4, 5].map((card) => (
                <div key={card}>
                  <div className="aspect-4/5 bg-paper-deep" />
                  <div className="mt-4 h-3 w-2/3 bg-paper-deep" />
                  <div className="mt-2.5 h-4 w-5/6 bg-paper-deep" />
                  <div className="mt-2.5 h-3 w-1/3 bg-paper-deep" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
