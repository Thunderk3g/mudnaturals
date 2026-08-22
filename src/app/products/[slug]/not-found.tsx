import { Section } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { copy } from "@/content/copy";

export default function ProductNotFound() {
  return (
    <Section>
      <div className="max-w-xl">
        <p className="spec">404</p>
        <h1 className="mt-3 text-4xl">{copy.errors.notFoundTitle}</h1>
        <p className="mt-3 text-ink-2">{copy.errors.notFoundBody}</p>
        <LinkButton href="/shop" size="lg" className="mt-8">
          {copy.errors.notFoundCta}
        </LinkButton>
      </div>
    </Section>
  );
}
