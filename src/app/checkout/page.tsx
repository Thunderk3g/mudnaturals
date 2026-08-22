import type { Metadata } from "next";
import { getSettings } from "@/server/queries";
import { CheckoutForm } from "@/app/checkout/checkout-form";
import { copy } from "@/content/copy";
import {
  FALLBACK_COD,
  FALLBACK_SHIPPING,
  type CodSettings,
  type ShippingSettings,
} from "@/content/checkout-copy";

export const metadata: Metadata = {
  title: copy.checkout.title,
  robots: { index: false, follow: false },
};

// Rates and the COD ceiling are operational settings; never serve them stale.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [shipping, cod] = await Promise.all([
    getSettings<ShippingSettings>("shipping"),
    getSettings<CodSettings>("cod"),
  ]);

  return (
    <div className="container-page py-14 lg:py-20">
      <header className="mb-10 border-b border-rule pb-5">
        <p className="spec">{copy.checkout.guestNote}</p>
        <h1 className="mt-2 text-4xl lg:text-5xl">{copy.checkout.title}</h1>
      </header>
      <CheckoutForm shipping={shipping ?? FALLBACK_SHIPPING} cod={cod ?? FALLBACK_COD} />
    </div>
  );
}
