"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { retryPayment } from "@/app/checkout/actions";
import { EsewaHandoff } from "@/app/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";
import { checkoutCopy, type EsewaHandoffPayload } from "@/content/checkout-copy";

/**
 * The two pieces of the order page that have to run in the browser: the poll
 * that lets a verifying payment resolve itself, and the one-tap retry.
 *
 * Status is always re-read from the database by `router.refresh()`. Nothing
 * here ever decides what the order's state is.
 */

const TICK_MS = 5000;
const MAX_TICKS = 36; // ~3 minutes, then the cron owns it and we say so.

export function OrderPoll() {
  const router = useRouter();
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    if (ticks >= MAX_TICKS) return;
    const timer = setTimeout(() => {
      setTicks((n) => n + 1);
      router.refresh();
    }, TICK_MS);
    return () => clearTimeout(timer);
  }, [ticks, router]);

  return (
    <p className="spec mt-6 normal-case tracking-normal" aria-live="polite">
      {ticks >= MAX_TICKS ? checkoutCopy.order.pollStopped : checkoutCopy.order.stillWaiting}
    </p>
  );
}

export function RetryPayment({ token }: { token: string }) {
  const [payment, setPayment] = useState<EsewaHandoffPayload | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (payment) return <EsewaHandoff payment={payment} />;

  async function retry() {
    setPending(true);
    setError(null);
    const result = await retryPayment(token);
    if (result.ok) setPayment(result.payment);
    else {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button type="button" size="lg" disabled={pending} onClick={retry}>
        {pending ? checkoutCopy.order.retryingBody : copy.order.retry}
      </Button>
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="mt-4 border border-bad bg-bad-soft px-4 py-3 text-sm text-ink">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
