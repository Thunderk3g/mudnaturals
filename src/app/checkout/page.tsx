import type { Metadata } from "next";
import { getSettings } from "@/server/queries";
import { CheckoutForm } from "@/app/checkout/checkout-form";
import { copy } from "@/content/copy";
import {
  FALLBACK_COD,
  FALLBACK_SHIPPING,
  type CodSettings,
  type OnlineMethod,
  type ShippingSettings,
} from "@/content/checkout-copy";

export const metadata: Metadata = {
  title: copy.checkout.title,
  robots: { index: false, follow: false },
};

// Rates and the COD ceiling are operational settings; never serve them stale.
export const dynamic = "force-dynamic";

const ONLINE_METHODS: OnlineMethod[] = ["esewa", "khalti", "fonepay"];

export default async function CheckoutPage() {
  const [shipping, cod, payments] = await Promise.all([
    getSettings<ShippingSettings>("shipping"),
    getSettings<CodSettings>("cod"),
    getSettings<{ enabled?: Record<string, boolean> }>("payments"),
  ]);

  // A method is offered unless the console explicitly turned it off — a
  // missing settings row must not close the shop's tills.
  const onlineMethods = ONLINE_METHODS.filter(
    (method) => payments?.enabled?.[method] !== false,
  );

  return (
    <div className="container-page py-14 lg:py-20">
      <header className="mb-10 border-b border-rule pb-5">
        <p className="spec">{copy.checkout.guestNote}</p>
        <h1 className="mt-2 text-4xl lg:text-5xl">{copy.checkout.title}</h1>
      </header>
      <CheckoutForm
        shipping={shipping ?? FALLBACK_SHIPPING}
        cod={cod ?? FALLBACK_COD}
        onlineMethods={onlineMethods}
      />
    </div>
  );
}
