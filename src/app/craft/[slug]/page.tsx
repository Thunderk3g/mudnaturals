import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCraft } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { SpecList } from "@/components/ui/spec";
import { ProductRail } from "@/components/story/product-rail";
import { ProcessSteps, type ProcessStep } from "@/components/story/process-steps";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

/**
 * `getCraft` returns a material *or* a technique, but its declared return type
 * collapses to the material shape — the `material ?? technique` in queries.ts
 * erases the union, because the destructured row is not typed as optional. The
 * runtime discriminant is real, so it is re-widened here rather than by
 * reaching into a shared file this page does not own.
 */
function craftKind(entry: { kind: string }): "material" | "technique" {
  return entry.kind === "technique" ? "technique" : "material";
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const craft = await getCraft(slug);
  if (!craft) return { title: copy.errors.notFoundTitle };

  const kind =
    craftKind(craft) === "technique"
      ? storyCopy.craft.kindTechnique
      : storyCopy.craft.kindMaterial;
  const description = craft.description ?? `${kind} used by the makers at ${copy.brand.name}.`;

  return {
    title: craft.local_name ? `${craft.name} (${craft.local_name})` : craft.name,
    description,
    keywords: [craft.name, craft.local_name, kind, "Nepal", "craft"].filter(
      (k): k is string => Boolean(k),
    ),
    alternates: { canonical: `/craft/${craft.slug}` },
    openGraph: { type: "article", title: craft.name, description },
  };
}

export default async function CraftEntryPage({ params }: Params) {
  const { slug } = await params;
  const craft = await getCraft(slug);
  if (!craft) notFound();

  const isTechnique = craftKind(craft) === "technique";
  const steps = isTechnique ? (craft.steps as ProcessStep[] | null) : null;
  const originNote = isTechnique ? null : craft.origin_note;
  const kindLabel = isTechnique ? storyCopy.craft.kindTechnique : storyCopy.craft.kindMaterial;

  return (
    <>
      <Section tight>
        <Breadcrumb
          trail={[
            { href: "/", label: "Home" },
            { href: "/craft", label: copy.craft.title },
            { label: craft.name },
          ]}
        />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{kindLabel}</p>
            {/* The Nepali vocabulary is the heading, not a parenthetical. */}
            <h1 className="text-4xl lg:text-5xl">{craft.name}</h1>
            {craft.local_name ? (
              <p className="mt-3 font-serif text-3xl text-ink-2" lang="ne">
                {craft.local_name}
              </p>
            ) : null}

            <SpecList
              className="mt-8"
              items={[
                { label: copy.product.details, value: kindLabel },
                { label: storyCopy.craft.localName, value: craft.local_name },
                { label: storyCopy.craft.origin, value: originNote },
                { label: storyCopy.craft.objectCount, value: craft.products.length || null },
                {
                  label: copy.craft.practisedBy,
                  value: craft.makers.map((m) => m.display_name).join(" · "),
                },
              ]}
            />
          </div>

          <div className="rise lg:col-span-7">
            {craft.description ? (
              <Prose className="text-lg">
                {craft.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((para) => (
                    <p key={para.slice(0, 24)}>{para}</p>
                  ))}
              </Prose>
            ) : null}

            {isTechnique && steps?.length ? (
              <div className="mt-12">
                <h2 className="text-2xl">{storyCopy.craft.steps}</h2>
                <p className="mt-2 max-w-[58ch] text-ink-2">{storyCopy.makers.processIntro}</p>
                <ProcessSteps className="mt-6" steps={steps} />
              </div>
            ) : null}

            {!isTechnique && originNote ? (
              <div className="mt-12 border-l-2 border-clay pl-6">
                <p className="spec">{storyCopy.craft.origin}</p>
                <p className="mt-2 text-lg text-ink">{originNote}</p>
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={kindLabel}
          title={copy.craft.madeWith}
          products={craft.products}
          action={{ href: "/shop", label: copy.shop.allProducts }}
        />
      </Section>

      {craft.makers.length ? (
        <Section tight className="pt-0">
          <Rule className="mb-10" />
          <h2 className="text-2xl">{copy.craft.practisedBy}</h2>
          <ul className="mt-6 border-t border-rule">
            {craft.makers.map((maker) => (
              <li key={maker.slug} className="border-b border-rule">
                <Link
                  href={`/makers/${maker.slug}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-4 hover:text-clay"
                >
                  <span className="text-lg">{maker.display_name}</span>
                  <span className="spec">{maker.district}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
