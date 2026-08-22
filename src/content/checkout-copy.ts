/**
 * Cart and checkout: the strings `copy.ts` does not carry, the Nepali address
 * data the form is built on, and the types shared between the client cart and
 * the server action.
 *
 * Types live here rather than in `actions.ts` because a `"use server"` module
 * may only export async functions. Pure helpers live here for the same reason:
 * `shippingFor` mirrors the arithmetic inside `place_order` exactly, so the
 * estimate the customer sees in the cart is the number the database charges.
 *
 * Copy register: verbs of making. No help, support, empower, uplift.
 */

export const checkoutCopy = {
  cart: {
    estimatedDelivery: "Delivery, estimated",
    estimateNote: "Shown at the outside-valley rate until you enter a district. It can only go down.",
    deliveryInsideValley: "Inside Kathmandu Valley",
    deliveryOutsideValley: "Outside the valley",
    freeProgressLabel: "Toward free delivery",
    reviewTitle: "Two things changed while your cart was open",
    reviewTitleOne: "One thing changed while your cart was open",
    pricedAt: (from: string, to: string) => `Repriced from ${from} to ${to}.`,
    stockShort: (n: number) => (n === 1 ? "Only 1 left — lower the quantity." : `Only ${n} left — lower the quantity.`),
    stockGone: "Sold out. Remove it to continue.",
    lineUnavailable: "No longer in the shop.",
    removeUnavailable: "Remove",
    blocked: "Adjust the lines above before you check out.",
    loading: "Pricing your cart…",
    summary: (n: number, total: string) => `${n === 1 ? "1 item" : `${n} items`}, subtotal ${total}.`,
    miniTitle: "Just added",
    viewCart: "View cart",
  },

  checkout: {
    step: (n: number) => `Step ${n}`,
    edit: "Edit",
    continueToDelivery: "Continue to delivery",
    continueToPayment: "Continue to payment",
    guestHeading: "Checking out as a guest",
    fieldsNote: "Every field is marked required or optional. Eight fields, no account.",
    giftHeading: "Sending this to someone else",
    giftHelp: "We leave the price off the packing slip and write your note on a card.",
    giftNoteHelp: "Written by hand on a card. Optional.",
    recipientPhoneHelp: "The courier calls this number, not yours.",
    couponLabel: "Coupon code",
    couponHelp: "Any discount is calculated when the order is placed.",
    methodHeading: "How you would like to pay",
    esewaNote: "You will finish on eSewa and come straight back.",
    codCeiling: (max: string) => `Cash on delivery is available up to ${max}. This order is above that, so pay with eSewa.`,
    codClosed: "Cash on delivery is closed right now.",
    totalDue: "Total due",
    deliveryTo: (district: string) => `Delivery to ${district}`,
    placingBody: "Taking you to your order…",
    redirectingToEsewa: "Opening eSewa…",
    redirectingNote: "If nothing happens in a few seconds, use the button below.",
    continueManually: "Continue to eSewa",
    emptyTitle: "Nothing to check out",
    accountNote: "An account is not needed to order. If you want one later, we can attach it to this phone number.",
    errors: {
      phoneRequired: "Add a phone number — the courier calls before delivering.",
      phoneFormat: "That is not a Nepali mobile number. Ten digits, starting 98, 97 or 96.",
      emailFormat: "That email address is missing an @ or a domain.",
      nameRequired: "Add the name the courier should ask for.",
      provinceRequired: "Choose a province.",
      districtRequired: "Choose a district — it sets the delivery rate.",
      municipalityRequired: "Add the municipality and ward number.",
      toleRequired: "Add the tole or street.",
      recipientNameRequired: "Add the name of the person receiving this.",
      recipientPhoneRequired: "Add the phone number of the person receiving this.",
      cartEmpty: "Your cart is empty.",
      cartBlocked: "Some lines in your cart need adjusting first.",
    },
  },

  order: {
    itemsHeading: "What is coming",
    addressHeading: "Delivering to",
    totalsHeading: "Totals",
    paymentMethod: "Payment",
    methodEsewa: "eSewa",
    methodCod: "Cash on delivery",
    stillWaiting: "Still confirming. This page checks again every few seconds.",
    pollStopped: "Still with eSewa. We will message you the moment it clears — nothing more is needed from you.",
    cancelledTitle: "Order cancelled",
    cancelledBody: "This order is closed. Nothing has been charged.",
    refundedTitle: "Refunded",
    refundedBody: "The amount has been returned through the same channel it arrived on.",
    reviewTitle: "Checking this one by hand",
    reviewBody: "eSewa returned an unclear result, so a person is reconciling it. We will message you today.",
    refusedTitle: "Delivery refused",
    refusedBody: "The parcel came back to us. Write to us and we will sort out what happens next.",
    accountNote: "No account was needed for this. Keep this link — it is the whole order.",
    retryingBody: "Reopening eSewa for this order…",
    lookupNumberLabel: "Order number, or the link we sent you",
    lookupNumberHelp: "Something like MUD-2K4R7C, or the whole https:// link.",
    lookupPhoneLabel: "Phone on the order",
    lookupPhoneHelp: "Not needed if you pasted the link.",
    lookupSubmit: "Find it",
  },
} as const;

// ------------------------------------------------------------- settings ----

export type ShippingSettings = {
  inside_valley_paisa: number;
  outside_valley_paisa: number;
  free_over_paisa: number;
  valley_districts: string[];
};

export type CodSettings = {
  enabled: boolean;
  max_order_paisa: number;
};

/** Used only if the settings row is missing; matches the seed in 009. */
export const FALLBACK_SHIPPING: ShippingSettings = {
  inside_valley_paisa: 15000,
  outside_valley_paisa: 25000,
  free_over_paisa: 500000,
  valley_districts: ["Kathmandu", "Lalitpur", "Bhaktapur"],
};

export const FALLBACK_COD: CodSettings = { enabled: true, max_order_paisa: 1500000 };

/**
 * The same three branches as `place_order`, in the same order. Worst case
 * (outside the valley) when no district is known yet, so the cart never
 * reveals a *higher* number later.
 */
export function shippingFor(
  subtotalPaisa: number,
  district: string | null,
  settings: ShippingSettings,
): number {
  if (subtotalPaisa <= 0) return 0;
  if (subtotalPaisa >= settings.free_over_paisa) return 0;
  if (district && settings.valley_districts.includes(district)) return settings.inside_valley_paisa;
  return settings.outside_valley_paisa;
}

// ---------------------------------------------------------------- cart ----

export type CartItem = { variantId: string; quantity: number };

export type PricedLine = {
  variantId: string;
  quantity: number;
  slug: string;
  name: string;
  variantLabel: string | null;
  sku: string;
  makerName: string | null;
  image: string | null;
  unitPaisa: number;
  available: number;
  lineTotalPaisa: number;
};

export type CartView = {
  lines: PricedLine[];
  /** In the cart but no longer purchasable — unpublished, or the variant is gone. */
  missingVariantIds: string[];
  subtotalPaisa: number;
  shipping: ShippingSettings;
};

// ------------------------------------------------------------ checkout ----

export type Address = {
  province: string;
  district: string;
  municipality: string;
  tole: string;
  landmark: string;
};

export type PlaceOrderInput = {
  items: CartItem[];
  phone: string;
  email: string;
  fullName: string;
  address: Address;
  paymentMethod: "esewa" | "cod";
  couponCode: string;
  gift: { note: string; recipientName: string; recipientPhone: string } | null;
  idempotencyKey: string;
};

/** What `initiateEsewaPayment(orderId)` hands back for the auto-posting form. */
export type EsewaHandoffPayload = {
  attemptId: string;
  formAction: string;
  fields: Record<string, string>;
};

export type PlaceOrderResult =
  | { ok: true; token: string; orderNumber: string; payment: EsewaHandoffPayload | null }
  | { ok: false; error: string };

export type RetryPaymentResult =
  | { ok: true; payment: EsewaHandoffPayload }
  | { ok: false; error: string };

/** Exactly the object `get_order_by_token` builds. */
export type OrderView = {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: "esewa" | "cod";
  total_paisa: number;
  subtotal_paisa: number;
  shipping_paisa: number;
  discount_paisa: number;
  placed_at: string;
  tracking_ref: string | null;
  shipping_address: Partial<Address>;
  items: {
    product_name: string;
    variant_label: string | null;
    quantity: number;
    unit_price_paisa: number;
    line_total_paisa: number;
    maker_name: string | null;
  }[];
};

// ----------------------------------------------------------- validation ----

/** `+977 98x-xxx-xxxx` and friends all collapse to ten digits. */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("977") ? digits.slice(3) : digits;
}

export function isNepaliMobile(input: string): boolean {
  return /^9[678]\d{8}$/.test(normalizePhone(input));
}

export function isEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}

// ------------------------------------------------------- Nepali address ----
//
// Seven provinces, seventy-seven districts. A select rather than a text field:
// `place_order` matches the district string against `valley_districts`, so a
// typo would quietly charge the outside-valley rate.

export const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;

export type Province = (typeof PROVINCES)[number];

export const DISTRICTS: Record<Province, readonly string[]> = {
  Koshi: [
    "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
    "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung",
    "Terhathum", "Udayapur",
  ],
  Madhesh: [
    "Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha",
  ],
  Bagmati: [
    "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok",
    "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli",
    "Sindhupalchok",
  ],
  Gandaki: [
    "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi",
    "Nawalpur", "Parbat", "Syangja", "Tanahun",
  ],
  Lumbini: [
    "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa",
    "Parasi", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi",
  ],
  Karnali: [
    "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
    "Rukum West", "Salyan", "Surkhet",
  ],
  Sudurpashchim: [
    "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti",
    "Kailali", "Kanchanpur",
  ],
};

export function districtsIn(province: string): readonly string[] {
  return DISTRICTS[province as Province] ?? [];
}

// ------------------------------------------------------------ statuses ----

/** Honest labels for the mono status register. Never invent a happier word. */
export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_verifying: "Confirming payment",
  paid: "Paid",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  expired: "Payment expired",
  failed: "Payment failed",
  manual_review: "Under review",
  refused: "Refused at delivery",
};
