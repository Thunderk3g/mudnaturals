"use client";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/layout";
import { copy } from "@/content/copy";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Section>
      <h1 className="max-w-2xl text-4xl lg:text-5xl">{copy.errors.genericTitle}</h1>
      <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2">
        {copy.errors.genericBody}
      </p>
      <Button size="lg" className="mt-9" onClick={reset}>
        {copy.errors.tryAgain}
      </Button>
      {error.digest ? <p className="spec mt-8">{error.digest}</p> : null}
    </Section>
  );
}
