import type { Metadata } from "next";
import { lookupOrder } from "@/app/checkout/actions";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { checkoutCopy } from "@/content/checkout-copy";

export const metadata: Metadata = {
  title: copy.order.lookupTitle,
  robots: { index: false, follow: true },
};

const inputClass =
  "w-full border border-rule-strong bg-surface px-3 py-2.5 text-ink placeholder:text-ink-3 " +
  "focus:border-clay focus:outline-none";

/**
 * A plain server-action form: it works with JavaScript switched off, which is
 * the point of a page people reach on a bad connection from a link they lost.
 */
export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="container-page py-14 lg:py-20">
      <div className="max-w-lg">
        <p className="spec">{copy.footer.trackOrder}</p>
        <h1 className="mt-2 text-4xl lg:text-5xl">{copy.order.lookupTitle}</h1>
        <p className="mt-4 text-ink-2">{copy.order.lookupHelp}</p>

        <form action={lookupOrder} className="mt-10 grid gap-5">
          <div>
            <label htmlFor="query" className="spec flex items-baseline justify-between gap-3 text-ink">
              <span>{checkoutCopy.order.lookupNumberLabel}</span>
              <span className="text-ink-3">{copy.checkout.required}</span>
            </label>
            <input
              id="query"
              name="query"
              required
              autoComplete="off"
              aria-describedby="query-help"
              className={`${inputClass} mt-1.5`}
            />
            <p id="query-help" className="spec mt-1.5 normal-case tracking-normal">
              {checkoutCopy.order.lookupNumberHelp}
            </p>
          </div>

          <div>
            <label htmlFor="phone" className="spec flex items-baseline justify-between gap-3 text-ink">
              <span>{checkoutCopy.order.lookupPhoneLabel}</span>
              <span className="text-ink-3">{copy.checkout.optional}</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98XXXXXXXX"
              aria-describedby="phone-help"
              className={`${inputClass} mt-1.5`}
            />
            <p id="phone-help" className="spec mt-1.5 normal-case tracking-normal">
              {checkoutCopy.order.lookupPhoneHelp}
            </p>
          </div>

          <div aria-live="polite">
            {error ? (
              <p role="alert" className="border border-bad bg-bad-soft px-4 py-3 text-sm text-ink">
                {error === "missing"
                  ? `${copy.checkout.required}: ${checkoutCopy.order.lookupPhoneLabel.toLowerCase()}.`
                  : copy.order.notFound}
              </p>
            ) : null}
          </div>

          <div>
            <Button type="submit" size="lg">
              {checkoutCopy.order.lookupSubmit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
