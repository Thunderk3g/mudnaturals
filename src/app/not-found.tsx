import { LinkButton } from "@/components/ui/button";
import { Section } from "@/components/ui/layout";
import { copy } from "@/content/copy";

export default function NotFound() {
  return (
    <Section>
      <p className="spec">404</p>
      <h1 className="mt-4 max-w-2xl text-4xl lg:text-5xl">{copy.errors.notFoundTitle}</h1>
      <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2">
        {copy.errors.notFoundBody}
      </p>
      <LinkButton href="/shop" size="lg" className="mt-9">
        {copy.errors.notFoundCta}
      </LinkButton>
    </Section>
  );
}
