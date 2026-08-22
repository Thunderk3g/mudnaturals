"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import {
  CartSubtotal,
  DeliveryEstimate,
  useCartView,
} from "@/components/cart/cart-lines";
import { placeOrder } from "@/app/checkout/actions";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/layout";
import { Price } from "@/components/ui/spec";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import {
  checkoutCopy,
  districtsIn,
  isEmail,
  isNepaliMobile,
  normalizePhone,
  PROVINCES,
  shippingFor,
  type CodSettings,
  type EsewaHandoffPayload,
  type ShippingSettings,
} from "@/content/checkout-copy";

/**
 * One page, three sections, guest by default. Contact comes first so a drop-off
 * at the payment step is still a person we can call back.
 *
 * The idempotency key is minted once at mount — not per click — so a double
 * submit on a dropping mobile connection replays into the same order.
 */

type Values = {
  phone: string;
  email: string;
  fullName: string;
  province: string;
  district: string;
  municipality: string;
  tole: string;
  landmark: string;
  giftNote: string;
  recipientName: string;
  recipientPhone: string;
  couponCode: string;
};

type FieldName = keyof Values;

const EMPTY: Values = {
  phone: "",
  email: "",
  fullName: "",
  province: "",
  district: "",
  municipality: "",
  tole: "",
  landmark: "",
  giftNote: "",
  recipientName: "",
  recipientPhone: "",
  couponCode: "",
};

const CONTACT_FIELDS: FieldName[] = ["phone", "email", "fullName"];
const DELIVERY_FIELDS: FieldName[] = ["province", "district", "municipality", "tole"];
const GIFT_FIELDS: FieldName[] = ["recipientName", "recipientPhone"];

const errors = checkoutCopy.checkout.errors;

/** Adaptive: empty and malformed say different things, and say why it matters. */
function validate(field: FieldName, values: Values): string | null {
  const value = values[field].trim();
  switch (field) {
    case "phone":
      if (!value) return errors.phoneRequired;
      return isNepaliMobile(value) ? null : errors.phoneFormat;
    case "email":
      if (!value) return null;
      return isEmail(value) ? null : errors.emailFormat;
    case "fullName":
      return value.length >= 2 ? null : errors.nameRequired;
    case "province":
      return value ? null : errors.provinceRequired;
    case "district":
      return value ? null : errors.districtRequired;
    case "municipality":
      return value ? null : errors.municipalityRequired;
    case "tole":
      return value ? null : errors.toleRequired;
    case "recipientName":
      return value.length >= 2 ? null : errors.recipientNameRequired;
    case "recipientPhone":
      if (!value) return errors.recipientPhoneRequired;
      return isNepaliMobile(value) ? null : errors.phoneFormat;
    default:
      return null;
  }
}

function newIdempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

// ------------------------------------------------------------ primitives ----

function FieldShell({
  id,
  label,
  required,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  required: boolean;
  help?: string;
  error?: string | null;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const helpId = help ? `${id}-help` : null;
  const errorId = error ? `${id}-error` : null;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="spec flex items-baseline justify-between gap-3 text-ink">
        <span>{label}</span>
        <span className={required ? "text-ink-3" : "text-ink-3"}>
          {required ? copy.checkout.required : copy.checkout.optional}
        </span>
      </label>
      <div className="mt-1.5">{children(describedBy)}</div>
      {help ? (
        <p id={helpId ?? undefined} className="spec mt-1.5 normal-case tracking-normal">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId ?? undefined} className="spec mt-1.5 normal-case tracking-normal text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full border border-rule-strong bg-surface px-3 py-2.5 text-ink placeholder:text-ink-3 " +
  "focus:border-clay focus:outline-none aria-[invalid=true]:border-bad";

function Step({
  index,
  title,
  open,
  complete,
  summary,
  onOpen,
  children,
}: {
  index: number;
  title: string;
  open: boolean;
  complete: boolean;
  summary?: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  const panelId = `checkout-step-${index}`;
  return (
    <section className="border-b border-rule py-6 first:pt-0">
      <h2>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-baseline justify-between gap-4 text-left"
        >
          <span className="flex items-baseline gap-4">
            <span className={`spec ${open || complete ? "text-clay" : ""}`}>
              {checkoutCopy.checkout.step(index)}
            </span>
            <span className="font-serif text-2xl">{title}</span>
          </span>
          {!open && complete ? (
            <span className="spec text-ink hover:text-clay">{checkoutCopy.checkout.edit}</span>
          ) : null}
        </button>
      </h2>
      {!open && complete && summary ? (
        <p className="spec-value mt-2 text-ink-2">{summary}</p>
      ) : null}
      <div id={panelId} hidden={!open} className="pt-6">
        {children}
      </div>
    </section>
  );
}

/** Auto-posting handoff to eSewa. Also used by the retry on the order page. */
export function EsewaHandoff({ payment }: { payment: EsewaHandoffPayload }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <div className="rise border border-rule-strong bg-surface p-8 text-center">
      <p className="spec">{checkoutCopy.checkout.redirectingToEsewa}</p>
      <p className="mt-3 text-ink-2">{checkoutCopy.checkout.redirectingNote}</p>
      <form ref={formRef} action={payment.formAction} method="POST" className="mt-6">
        {Object.entries(payment.fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Button type="submit" size="lg">
          {checkoutCopy.checkout.continueManually}
        </Button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ form ----

export function CheckoutForm({
  shipping,
  cod,
}: {
  shipping: ShippingSettings;
  cod: CodSettings;
}) {
  const router = useRouter();
  const { items, count, mounted, clear } = useCart();
  const state = useCartView();
  const { view, blocked } = state;

  const [values, setValues] = useState<Values>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [isGift, setIsGift] = useState(false);
  const [method, setMethod] = useState<"esewa" | "cod">("esewa");
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payment, setPayment] = useState<EsewaHandoffPayload | null>(null);
  const [idempotencyKey] = useState(newIdempotencyKey);

  const panelRef = useRef<HTMLFormElement>(null);

  const subtotalPaisa = view?.subtotalPaisa ?? 0;
  const district = values.district || null;
  const shippingPaisa = shippingFor(subtotalPaisa, district, shipping);
  const totalPaisa = subtotalPaisa + shippingPaisa;

  const codOverCeiling = totalPaisa > cod.max_order_paisa;
  const codAvailable = cod.enabled && !codOverCeiling && subtotalPaisa > 0;

  // A district change can push the total over the COD ceiling mid-flow.
  useEffect(() => {
    if (method === "cod" && !codAvailable) setMethod("esewa");
  }, [method, codAvailable]);

  // Opening a section moves focus into it rather than leaving it behind. Not on
  // first paint: nobody wants a mobile keyboard thrown at them on arrival.
  const firstPaint = useRef(true);
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    const panel = panelRef.current?.querySelector<HTMLElement>(`#checkout-step-${step + 1}`);
    panel?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, [step]);

  function set(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Never validate on keystroke; clearing a shown error as they fix it is
    // the one exception, because leaving it up reads as unfixable.
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function blur(field: FieldName) {
    const message = validate(field, values);
    setFieldErrors((prev) => ({ ...prev, [field]: message ?? undefined }));
  }

  function checkAll(fields: FieldName[]): boolean {
    const next: Partial<Record<FieldName, string>> = {};
    let ok = true;
    for (const field of fields) {
      const message = validate(field, values);
      if (message) {
        next[field] = message;
        ok = false;
      }
    }
    setFieldErrors((prev) => ({ ...prev, ...next }));
    return ok;
  }

  function advance(from: number, fields: FieldName[]) {
    if (!checkAll(fields)) return;
    setStep(from + 1);
    setReached((prev) => Math.max(prev, from + 1));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const required = [
      ...CONTACT_FIELDS,
      ...DELIVERY_FIELDS,
      ...(isGift ? GIFT_FIELDS : []),
    ];
    if (!checkAll(required)) {
      // Reopen the earliest section that still has something wrong in it.
      const contactOk = CONTACT_FIELDS.every((field) => !validate(field, values));
      setStep(contactOk ? 1 : 0);
      return;
    }
    if (!count) return setFormError(errors.cartEmpty);
    if (blocked) return setFormError(errors.cartBlocked);

    setPending(true);
    const result = await placeOrder({
      items,
      phone: normalizePhone(values.phone),
      email: values.email.trim(),
      fullName: values.fullName.trim(),
      address: {
        province: values.province,
        district: values.district,
        municipality: values.municipality.trim(),
        tole: values.tole.trim(),
        landmark: values.landmark.trim(),
      },
      paymentMethod: method,
      couponCode: values.couponCode.trim(),
      gift: isGift
        ? {
            note: values.giftNote.trim(),
            recipientName: values.recipientName.trim(),
            recipientPhone: normalizePhone(values.recipientPhone),
          }
        : null,
      idempotencyKey,
    });

    if (!result.ok) {
      setPending(false);
      setFormError(result.error);
      return;
    }

    // The order owns the stock now, so the cart has done its job.
    setLeaving(true);
    clear();
    if (result.payment) setPayment(result.payment);
    else router.push(`/order/${result.token}`);
  }

  if (payment) return <EsewaHandoff payment={payment} />;

  if (leaving) {
    return (
      <div className="border border-rule-strong bg-surface p-10 text-center">
        <p className="spec">{copy.checkout.placing}</p>
        <p className="mt-3 text-ink-2">{checkoutCopy.checkout.placingBody}</p>
      </div>
    );
  }

  if (mounted && count === 0) {
    return (
      <EmptyState
        title={checkoutCopy.checkout.emptyTitle}
        body={copy.cart.empty}
        action={<LinkButton href="/shop" size="lg">{copy.cart.emptyCta}</LinkButton>}
      />
    );
  }

  const contactSummary = [values.fullName, values.phone, values.email]
    .filter(Boolean)
    .join(" · ");
  const deliverySummary = [values.tole, values.municipality, values.district, values.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
      <form ref={panelRef} onSubmit={submit} noValidate>
        <p className="spec mb-8">{checkoutCopy.checkout.fieldsNote}</p>

        {/* 1 — Contact. First on purpose: a phone number makes a drop-off
            recoverable, an address without one does not. */}
        <Step
          index={1}
          title={copy.checkout.contact}
          open={step === 0}
          complete={reached > 0}
          summary={contactSummary}
          onOpen={() => setStep(0)}
        >
          <div className="grid gap-5">
            <FieldShell id="phone" label={copy.checkout.phone} required help={copy.checkout.phoneHelp} error={fieldErrors.phone}>
              {(describedBy) => (
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98XXXXXXXX"
                  className={inputClass}
                  value={values.phone}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={describedBy}
                  onChange={(e) => set("phone", e.target.value)}
                  onBlur={() => blur("phone")}
                />
              )}
            </FieldShell>

            <FieldShell id="fullName" label={copy.checkout.fullName} required error={fieldErrors.fullName}>
              {(describedBy) => (
                <input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  className={inputClass}
                  value={values.fullName}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={describedBy}
                  onChange={(e) => set("fullName", e.target.value)}
                  onBlur={() => blur("fullName")}
                />
              )}
            </FieldShell>

            <FieldShell
              id="email"
              label={copy.checkout.email}
              required={false}
              help={copy.checkout.emailHelp}
              error={fieldErrors.email}
            >
              {(describedBy) => (
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  value={values.email}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={describedBy}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => blur("email")}
                />
              )}
            </FieldShell>

            <div>
              <Button type="button" onClick={() => advance(0, CONTACT_FIELDS)} size="lg">
                {checkoutCopy.checkout.continueToDelivery}
              </Button>
            </div>
          </div>
        </Step>

        {/* 2 — Delivery. Province → district → municipality/ward → tole →
            landmark. No postcode: nothing in Nepal routes on one. */}
        <Step
          index={2}
          title={copy.checkout.delivery}
          open={step === 1}
          complete={reached > 1}
          summary={deliverySummary}
          onOpen={() => reached >= 1 && setStep(1)}
        >
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell id="province" label={copy.checkout.province} required error={fieldErrors.province}>
                {(describedBy) => (
                  <select
                    id="province"
                    name="province"
                    className={inputClass}
                    value={values.province}
                    aria-invalid={Boolean(fieldErrors.province)}
                    aria-describedby={describedBy}
                    onChange={(e) => {
                      set("province", e.target.value);
                      set("district", "");
                    }}
                    onBlur={() => blur("province")}
                  >
                    <option value="">—</option>
                    {PROVINCES.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                )}
              </FieldShell>

              <FieldShell
                id="district"
                label={copy.checkout.district}
                required
                help={values.district ? checkoutCopy.checkout.deliveryTo(values.district) : undefined}
                error={fieldErrors.district}
              >
                {(describedBy) => (
                  <select
                    id="district"
                    name="district"
                    className={inputClass}
                    value={values.district}
                    disabled={!values.province}
                    aria-invalid={Boolean(fieldErrors.district)}
                    aria-describedby={describedBy}
                    onChange={(e) => set("district", e.target.value)}
                    onBlur={() => blur("district")}
                  >
                    <option value="">—</option>
                    {districtsIn(values.province).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </FieldShell>
            </div>

            <FieldShell id="municipality" label={copy.checkout.municipality} required error={fieldErrors.municipality}>
              {(describedBy) => (
                <input
                  id="municipality"
                  name="municipality"
                  autoComplete="address-level2"
                  placeholder="Lalitpur Metropolitan City, Ward 3"
                  className={inputClass}
                  value={values.municipality}
                  aria-invalid={Boolean(fieldErrors.municipality)}
                  aria-describedby={describedBy}
                  onChange={(e) => set("municipality", e.target.value)}
                  onBlur={() => blur("municipality")}
                />
              )}
            </FieldShell>

            <FieldShell id="tole" label={copy.checkout.tole} required error={fieldErrors.tole}>
              {(describedBy) => (
                <input
                  id="tole"
                  name="tole"
                  autoComplete="address-line1"
                  className={inputClass}
                  value={values.tole}
                  aria-invalid={Boolean(fieldErrors.tole)}
                  aria-describedby={describedBy}
                  onChange={(e) => set("tole", e.target.value)}
                  onBlur={() => blur("tole")}
                />
              )}
            </FieldShell>

            <FieldShell
              id="landmark"
              label={copy.checkout.landmark}
              required={false}
              help={copy.checkout.landmarkHelp}
            >
              {(describedBy) => (
                <input
                  id="landmark"
                  name="landmark"
                  className={inputClass}
                  placeholder="Beside Patan Durbar Square"
                  value={values.landmark}
                  aria-describedby={describedBy}
                  onChange={(e) => set("landmark", e.target.value)}
                />
              )}
            </FieldShell>

            {/* The diaspora flow: sending something home from abroad. */}
            <fieldset className="border-t border-rule pt-5">
              <legend className="sr-only">{copy.checkout.isGift}</legend>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="h-4 w-4 accent-[#b4552d]"
                />
                <span>{copy.checkout.isGift}</span>
              </label>
              <p className="spec mt-2 normal-case tracking-normal">{checkoutCopy.checkout.giftHelp}</p>

              {isGift ? (
                <div className="mt-5 grid gap-5">
                  <FieldShell id="recipientName" label={copy.checkout.recipientName} required error={fieldErrors.recipientName}>
                    {(describedBy) => (
                      <input
                        id="recipientName"
                        className={inputClass}
                        value={values.recipientName}
                        aria-invalid={Boolean(fieldErrors.recipientName)}
                        aria-describedby={describedBy}
                        onChange={(e) => set("recipientName", e.target.value)}
                        onBlur={() => blur("recipientName")}
                      />
                    )}
                  </FieldShell>

                  <FieldShell
                    id="recipientPhone"
                    label={copy.checkout.recipientPhone}
                    required
                    help={checkoutCopy.checkout.recipientPhoneHelp}
                    error={fieldErrors.recipientPhone}
                  >
                    {(describedBy) => (
                      <input
                        id="recipientPhone"
                        type="tel"
                        inputMode="tel"
                        placeholder="98XXXXXXXX"
                        className={inputClass}
                        value={values.recipientPhone}
                        aria-invalid={Boolean(fieldErrors.recipientPhone)}
                        aria-describedby={describedBy}
                        onChange={(e) => set("recipientPhone", e.target.value)}
                        onBlur={() => blur("recipientPhone")}
                      />
                    )}
                  </FieldShell>

                  <FieldShell
                    id="giftNote"
                    label={copy.checkout.giftNote}
                    required={false}
                    help={checkoutCopy.checkout.giftNoteHelp}
                  >
                    {(describedBy) => (
                      <textarea
                        id="giftNote"
                        rows={3}
                        maxLength={500}
                        className={inputClass}
                        value={values.giftNote}
                        aria-describedby={describedBy}
                        onChange={(e) => set("giftNote", e.target.value)}
                      />
                    )}
                  </FieldShell>
                </div>
              ) : null}
            </fieldset>

            <div>
              <Button
                type="button"
                onClick={() => advance(1, isGift ? [...DELIVERY_FIELDS, ...GIFT_FIELDS] : DELIVERY_FIELDS)}
                size="lg"
              >
                {checkoutCopy.checkout.continueToPayment}
              </Button>
            </div>
          </div>
        </Step>

        {/* 3 — Payment. Its own surface and border: perceived security is gut
            level and responds to exactly that. */}
        <Step
          index={3}
          title={copy.checkout.payment}
          open={step === 2}
          complete={false}
          onOpen={() => reached >= 2 && setStep(2)}
        >
          <div className="border border-rule-strong bg-surface p-6">
            <fieldset>
              <legend className="spec text-ink">{checkoutCopy.checkout.methodHeading}</legend>

              <div className="mt-4 grid gap-3">
                <label className="flex cursor-pointer items-start gap-3 border border-rule p-4 has-[:checked]:border-clay has-[:checked]:bg-clay-soft/40">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="esewa"
                    checked={method === "esewa"}
                    onChange={() => setMethod("esewa")}
                    className="mt-1 h-4 w-4 accent-[#b4552d]"
                  />
                  <span>
                    <span className="block">{copy.checkout.payWithEsewa}</span>
                    <span className="spec mt-1 block normal-case tracking-normal">
                      {checkoutCopy.checkout.esewaNote}
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-3 border border-rule p-4 has-[:checked]:border-clay has-[:checked]:bg-clay-soft/40 ${
                    codAvailable ? "cursor-pointer" : "opacity-55"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={method === "cod"}
                    disabled={!codAvailable}
                    onChange={() => setMethod("cod")}
                    className="mt-1 h-4 w-4 accent-[#b4552d]"
                  />
                  <span>
                    <span className="block">{copy.checkout.payWithCod}</span>
                    <span className="spec mt-1 block normal-case tracking-normal">
                      {!cod.enabled
                        ? checkoutCopy.checkout.codClosed
                        : codOverCeiling
                          ? checkoutCopy.checkout.codCeiling(formatNpr(cod.max_order_paisa))
                          : copy.checkout.codNote}
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div className="mt-6 border-t border-rule pt-5">
              <FieldShell
                id="couponCode"
                label={checkoutCopy.checkout.couponLabel}
                required={false}
                help={checkoutCopy.checkout.couponHelp}
              >
                {(describedBy) => (
                  <input
                    id="couponCode"
                    className={inputClass}
                    value={values.couponCode}
                    aria-describedby={describedBy}
                    onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
                  />
                )}
              </FieldShell>
            </div>

            <div className="mt-6 flex items-baseline justify-between gap-6 border-t border-rule-strong pt-5">
              <span className="spec text-ink">{checkoutCopy.checkout.totalDue}</span>
              <Price className="text-xl">{formatNpr(totalPaisa)}</Price>
            </div>

            <div aria-live="polite">
              {formError ? (
                <p role="alert" className="mt-5 border border-bad bg-bad-soft px-4 py-3 text-sm text-ink">
                  {formError}
                </p>
              ) : null}
            </div>

            <Button type="submit" size="lg" disabled={pending || blocked} className="mt-6 w-full">
              {pending ? copy.checkout.placing : copy.checkout.placeOrder}
            </Button>
            <p className="spec mt-3 normal-case tracking-normal">{copy.checkout.guestNote}</p>
          </div>
        </Step>
      </form>

      {/* The summary never leaves the screen: the full total, delivery
          included, is visible before the payment step and at it. */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <h2 className="spec border-b border-rule-strong pb-3 text-ink">{copy.checkout.orderSummary}</h2>

        {view ? (
          <>
            <ul className="mt-4 divide-y divide-rule border-b border-rule">
              {view.lines.map((line) => (
                <li key={line.variantId} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate">{line.name}</span>
                    <span className="spec">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}
                      {`× ${line.quantity}`}
                    </span>
                  </span>
                  <span className="spec-value shrink-0 tabular-nums">
                    {formatNpr(line.lineTotalPaisa)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <CartSubtotal view={view} />
            </div>
            <DeliveryEstimate view={view} district={district} />
            <div className="mt-6 flex items-baseline justify-between gap-6 border-t border-rule-strong pt-4">
              <span className="spec text-ink">{copy.cart.total}</span>
              <Price className="text-lg">{formatNpr(totalPaisa)}</Price>
            </div>
            {blocked ? (
              <p className="spec mt-4 text-warn" role="alert">
                {checkoutCopy.cart.blocked}{" "}
                <a href="/cart" className="underline decoration-rule-strong underline-offset-4">
                  {copy.cart.title}
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <p className="spec mt-4">{checkoutCopy.cart.loading}</p>
        )}
      </aside>
    </div>
  );
}
