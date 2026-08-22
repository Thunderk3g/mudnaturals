import type { Metadata } from "next";
import { CartPageBody } from "@/components/cart/cart-lines";
import { copy } from "@/content/copy";

export const metadata: Metadata = {
  title: copy.cart.title,
  robots: { index: false, follow: true },
};

/** The canonical cart URL. The mini-cart is a convenience; this is the page. */
export default function CartPage() {
  return (
    <div className="container-page py-14 lg:py-20">
      <header className="mb-10 border-b border-rule pb-5">
        <p className="spec">{copy.nav.cart}</p>
        <h1 className="mt-2 text-4xl lg:text-5xl">{copy.cart.title}</h1>
      </header>
      <CartPageBody />
    </div>
  );
}
