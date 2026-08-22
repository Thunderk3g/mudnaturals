"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql, withTx } from "@/lib/db";
import { getCartLines, getSettings } from "@/server/queries";
import { initiateEsewaPayment } from "@/server/payments";
import { copy } from "@/content/copy";
import {
  FALLBACK_SHIPPING,
  normalizePhone,
  isEmail,
  type CartView,
  type PlaceOrderInput,
  type PlaceOrderResult,
  type PricedLine,
  type RetryPaymentResult,
  type ShippingSettings,
} from "@/content/checkout-copy";

/**
 * Every mutation in the cart → checkout → order flow. No REST routes.
 *
 * The client sends variant ids, quantities and a coupon *code*. It never sends
 * a price, a discount or a total: `place_order` computes all money from the
 * products table inside one transaction, so this file opens none of its own.
 */

const itemsSchema = z
  .array(
    z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .max(50);

/** Read-only re-pricing for the cart and the checkout summary. */
export async function priceCart(items: unknown): Promise<CartView> {
  const parsed = itemsSchema.safeParse(items);
  const wanted = parsed.success ? parsed.data : [];

  const [rows, shipping] = await Promise.all([
    getCartLines(wanted.map((item) => item.variantId)),
    getSettings<ShippingSettings>("shipping"),
  ]);

  const byVariant = new Map(rows.map((row) => [row.variant_id, row]));
  const lines: PricedLine[] = [];
  const missingVariantIds: string[] = [];

  for (const item of wanted) {
    const row = byVariant.get(item.variantId);
    if (!row) {
      missingVariantIds.push(item.variantId);
      continue;
    }
    lines.push({
      variantId: row.variant_id,
      quantity: item.quantity,
      slug: row.product_slug,
      name: row.product_name,
      variantLabel: row.option_value,
      sku: row.sku,
      makerName: row.maker_name,
      image: row.image,
      unitPaisa: row.price_paisa,
      available: row.available,
      lineTotalPaisa: row.price_paisa * item.quantity,
    });
  }

  return {
    lines,
    missingVariantIds,
    subtotalPaisa: lines.reduce((total, line) => total + line.lineTotalPaisa, 0),
    shipping: shipping ?? FALLBACK_SHIPPING,
  };
}

// ----------------------------------------------------------- place order ----

const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((value) => /^9[678]\d{8}$/.test(value), "Not a Nepali mobile number");

const placeOrderSchema = z.object({
  items: itemsSchema.min(1),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || isEmail(value), "Not an email address"),
  fullName: z.string().trim().min(2).max(120),
  address: z.object({
    province: z.string().trim().min(1).max(60),
    district: z.string().trim().min(1).max(60),
    municipality: z.string().trim().min(1).max(160),
    tole: z.string().trim().min(1).max(200),
    landmark: z.string().trim().max(200),
  }),
  paymentMethod: z.enum(["esewa", "cod"]),
  couponCode: z.string().trim().max(40),
  gift: z
    .object({
      note: z.string().trim().max(500),
      recipientName: z.string().trim().min(2).max(120),
      recipientPhone: phoneSchema,
    })
    .nullable(),
  // Generated once per checkout attempt in component state, so a double-submit
  // on a flaky connection replays into the same order instead of a second one.
  idempotencyKey: z.string().trim().min(8).max(100),
});

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? copy.checkout.errorGeneric };
  }
  const data = parsed.data;

  let order: { order_id: string; order_number: string; lookup_token: string };
  try {
    const [row] = await sql<
      { order_id: string; order_number: string; lookup_token: string; total_paisa: number }[]
    >`
      select * from place_order(
        p_items           => ${JSON.stringify(
          data.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
        )}::jsonb,
        p_phone           => ${data.phone},
        p_email           => ${data.email || null},
        p_full_name       => ${data.fullName},
        p_address         => ${JSON.stringify({
          province: data.address.province,
          district: data.address.district,
          municipality: data.address.municipality,
          tole: data.address.tole,
          landmark: data.address.landmark,
        })}::jsonb,
        p_payment_method  => ${data.paymentMethod}::payment_method,
        p_idempotency_key => ${data.idempotencyKey},
        p_coupon_code     => ${data.couponCode || null},
        p_gift            => ${
          data.gift
            ? JSON.stringify({
                note: data.gift.note,
                recipient_name: data.gift.recipientName,
                recipient_phone: normalizePhone(data.gift.recipientPhone),
              })
            : null
        }::jsonb
      )
    `;
    if (!row) return { ok: false, error: copy.checkout.errorGeneric };
    order = row;
  } catch (error) {
    console.error("place_order failed", error);
    return { ok: false, error: humanError(error) };
  }

  if (data.paymentMethod === "cod") {
    return { ok: true, token: order.lookup_token, orderNumber: order.order_number, payment: null };
  }

  try {
    const payment = await initiateEsewaPayment(order.order_id);
    return { ok: true, token: order.lookup_token, orderNumber: order.order_number, payment };
  } catch (error) {
    console.error("initiateEsewaPayment failed", error);
    // The order exists and holds its stock. Send them to it and let them retry
    // there rather than losing the order behind a generic failure.
    return { ok: true, token: order.lookup_token, orderNumber: order.order_number, payment: null };
  }
}

// -------------------------------------------------------- retry payment ----

export async function retryPayment(token: string): Promise<RetryPaymentResult> {
  const [order] = await sql<{ id: string; status: string; payment_method: string }[]>`
    select id, status::text as status, payment_method::text as payment_method
      from orders where lookup_token = ${token}`;

  if (!order) return { ok: false, error: copy.order.notFound };
  if (order.payment_method !== "esewa") {
    return { ok: false, error: "This order is not paid through eSewa." };
  }
  if (!["failed", "expired", "pending_payment"].includes(order.status)) {
    return { ok: false, error: "This order no longer needs a payment." };
  }

  // Failing an attempt released the reservation, and `initiateEsewaPayment`
  // only opens an attempt on a `pending_payment` order. Take the stock back
  // first, in one transaction: if any line has since sold, nothing moves and
  // the order stays failed rather than becoming an unfulfillable payment.
  if (order.status !== "pending_payment") {
    try {
      await withTx(async (tx) => {
        const [reserved] = await tx<{ ok: boolean }[]>`
          select coalesce(bool_and(reserve_stock(variant_id, quantity)), false) as ok
            from order_items where order_id = ${order.id} and variant_id is not null`;
        if (!reserved?.ok) throw new Error("insufficient stock on retry");

        await tx`
          update orders set status = 'pending_payment'
           where id = ${order.id} and status in ('failed', 'expired')`;
      });
    } catch (error) {
      console.error("retryPayment could not re-reserve stock", error);
      return {
        ok: false,
        error:
          "Something in this order sold while the payment was failing. Write to us and we will put it right.",
      };
    }
  }

  try {
    return { ok: true, payment: await initiateEsewaPayment(order.id) };
  } catch (error) {
    console.error("retryPayment failed", error);
    return { ok: false, error: copy.checkout.errorGeneric };
  }
}

// --------------------------------------------------------- order lookup ----

/** 48 hex characters — `encode(gen_random_bytes(24), 'hex')`. */
function extractToken(input: string): string | null {
  const match = /[0-9a-f]{48}/i.exec(input);
  return match ? match[0].toLowerCase() : null;
}

export async function lookupOrder(formData: FormData): Promise<void> {
  const query = String(formData.get("query") ?? "").trim();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  const token = extractToken(query);
  if (token) redirect(`/order/${token}`);

  if (!query || !phone) redirect("/order/lookup?error=missing");

  const [row] = await sql<{ lookup_token: string }[]>`
    select lookup_token from orders
     where upper(order_number) = upper(${query.replace(/\s+/g, "")})
       and phone = ${phone}`;

  if (!row) redirect("/order/lookup?error=notfound");
  redirect(`/order/${row.lookup_token}`);
}

// --------------------------------------------------------------- errors ----

/**
 * `place_order` raises in plain English on purpose. Map each one to something a
 * customer can act on, and never let a raw Postgres string reach the browser.
 */
function humanError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  const soldOut = /insufficient stock for (.+)$/.exec(message);
  if (soldOut) {
    return `${soldOut[1]} sold out while your cart was open. Lower the quantity or remove it, then place the order again.`;
  }
  const unpublished = /product (.+) is not available/.exec(message);
  if (unpublished) return `${unpublished[1]} is no longer in the shop. Remove it and try again.`;

  if (/product not found/.test(message)) {
    return "One of these objects is no longer in the shop. Remove it and try again.";
  }
  if (/cart is empty/.test(message)) return copy.cart.empty;
  if (/invalid quantity/.test(message)) return "One of the quantities is not valid.";

  if (/coupon is not valid/.test(message)) return "That coupon code is not valid.";
  if (/coupon has already been used/.test(message)) return "You have already used that coupon.";
  if (/coupon is no longer available/.test(message)) return "That coupon has run out.";
  if (/coupon minimum/.test(message)) return "This order is below that coupon's minimum.";

  if (/above the cash-on-delivery limit/.test(message)) {
    return "This order is above the cash-on-delivery limit. Pay with eSewa to continue.";
  }
  if (/cash on delivery is not available for this account/.test(message)) {
    return "Cash on delivery is not available on this number. Pay with eSewa to continue.";
  }
  if (/cash on delivery is not available/.test(message)) {
    return copy.checkout.codUnavailable;
  }

  return copy.checkout.errorGeneric;
}
