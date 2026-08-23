import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { formatNpr } from "@/lib/money";
import { SpecList } from "@/components/ui/spec";
import { Rule } from "@/components/ui/layout";
import { OrderPoll, RetryPayment } from "@/app/order/[token]/order-live";
import { copy } from "@/content/copy";
import { checkoutCopy, STATUS_LABEL, type OrderView } from "@/content/checkout-copy";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// The poll refreshes this route; a cached render would poll forever.
export const dynamic = "force-dynamic";

/** Every word on this page comes from the row, never from the query string. */
function headline(order: OrderView): { title: string; body: string } {
  const { status, payment_method } = order;

  if (status === "failed" || status === "expired") {
    return { title: copy.order.failedTitle, body: copy.order.failedBody };
  }
  if (status === "pending_payment" || status === "payment_verifying") {
    return { title: copy.order.verifyingTitle, body: copy.order.verifyingBody };
  }
  if (status === "manual_review") {
    return { title: checkoutCopy.order.reviewTitle, body: checkoutCopy.order.reviewBody };
  }
  if (status === "cancelled") {
    return { title: checkoutCopy.order.cancelledTitle, body: checkoutCopy.order.cancelledBody };
  }
  if (status === "refunded" || status === "partially_refunded") {
    return { title: checkoutCopy.order.refundedTitle, body: checkoutCopy.order.refundedBody };
  }
  if (status === "refused") {
    return { title: checkoutCopy.order.refusedTitle, body: checkoutCopy.order.refusedBody };
  }
  // COD is only "we will call before dispatch" until it has actually moved.
  if (payment_method === "cod" && status === "confirmed") {
    return { title: copy.order.codTitle, body: copy.order.codBody };
  }
  return { title: copy.order.thanksTitle, body: copy.order.thanksBody(order.order_number) };
}

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/i.test(token)) notFound();

  const [row] = await sql<{ payload: OrderView | null }[]>`
    select get_order_by_token(${token}) as payload`;
  const order = row?.payload;
  if (!order) notFound();

  const { title, body } = headline(order);
  const address = order.shipping_address ?? {};
  const waiting = order.status === "pending_payment" || order.status === "payment_verifying";
  const canRetry =
    order.payment_method !== "cod" && (order.status === "failed" || order.status === "expired");
  const settled = !waiting && !canRetry && !["cancelled", "refused"].includes(order.status);

  return (
    <div className="container-page py-14 lg:py-20">
      <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <div className="rise">
          <p className="spec">{STATUS_LABEL[order.status] ?? order.status}</p>
          <h1 className="mt-3 text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-[55ch] text-lg leading-relaxed text-ink-2">{body}</p>

          {waiting ? <OrderPoll /> : null}
          {canRetry ? <RetryPayment token={token} /> : null}

          <SpecList
            className="mt-10"
            items={[
              { label: copy.order.orderNumber, value: order.order_number },
              { label: copy.order.status, value: STATUS_LABEL[order.status] ?? order.status },
              {
                label: checkoutCopy.order.paymentMethod,
                value:
                  order.payment_method === "cod"
                    ? checkoutCopy.order.methodCod
                    : checkoutCopy.order.methodOnline(order.payment_method),
              },
              {
                label: copy.order.placed,
                value: new Date(order.placed_at).toLocaleDateString("en-NP", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              },
              { label: copy.order.trackingRef, value: order.tracking_ref ?? "" },
            ]}
          />

          <h2 className="mt-12 text-2xl">{checkoutCopy.order.addressHeading}</h2>
          <address className="spec-value mt-3 not-italic leading-relaxed text-ink-2">
            {[address.tole, address.municipality, address.landmark, address.district, address.province]
              .filter(Boolean)
              .map((part) => (
                <span key={part} className="block">
                  {part}
                </span>
              ))}
          </address>

          {settled ? (
            <p className="spec mt-10 normal-case tracking-normal">{checkoutCopy.order.accountNote}</p>
          ) : null}

          <Rule className="mt-10" />
          <Link
            href="/shop"
            className="spec mt-6 inline-block text-ink underline decoration-rule-strong underline-offset-4 hover:text-clay"
          >
            {copy.cart.continueShopping}
          </Link>
        </div>

        <aside>
          <h2 className="spec border-b border-rule-strong pb-3 text-ink">
            {checkoutCopy.order.itemsHeading}
          </h2>
          <ul className="divide-y divide-rule border-b border-rule">
            {order.items.map((item, index) => (
              <li key={`${item.product_name}-${index}`} className="flex justify-between gap-4 py-4">
                <span className="min-w-0">
                  {item.maker_name ? <span className="spec block">{item.maker_name}</span> : null}
                  <span className="block">{item.product_name}</span>
                  <span className="spec">
                    {item.variant_label ? `${item.variant_label} · ` : ""}
                    {`× ${item.quantity}`}
                  </span>
                </span>
                <span className="spec-value shrink-0 tabular-nums">
                  {formatNpr(item.line_total_paisa)}
                </span>
              </li>
            ))}
          </ul>

          <SpecList
            className="mt-5"
            items={[
              { label: copy.cart.subtotal, value: formatNpr(order.subtotal_paisa) },
              {
                label: copy.cart.shipping,
                value: order.shipping_paisa === 0 ? copy.cart.shippingFree : formatNpr(order.shipping_paisa),
              },
              {
                label: copy.cart.discount,
                value: order.discount_paisa > 0 ? `− ${formatNpr(order.discount_paisa)}` : "",
              },
            ]}
          />

          <div className="mt-4 flex items-baseline justify-between gap-6 border-t border-rule-strong pt-4">
            <span className="spec text-ink">{copy.cart.total}</span>
            <span className="font-mono text-lg tabular-nums tracking-tight text-clay">
              {formatNpr(order.total_paisa)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
