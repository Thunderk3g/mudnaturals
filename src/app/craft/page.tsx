import type { Metadata } from "next";
import Link from "next/link";
import { listCraft, listProducts } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule, EmptyState } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ProductRail } from "@/components/story/product-rail";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.craft.title,
  description: copy.craft.intro,
  alternates: { canonical: "/craft" },
};

/**
 * The craft index is the SEO surface as well as the story surface: kans grass,
 * pater grass and gulguliya papyrus are published here as headings because
 * nobody else publishes them as structured entries at all.
 */
function CraftList({
  entries,
}: {
  entries: {
    slug: string;
    name: string;
    local_name?: string | null;
    description: string | null;
    count: number;
  }[];
}) {
  return (
    <ul className="border-t border-rule">
      {entries.map((entry) => (
        <li key={entry.slug} className="border-b border-rule">
          <Link
            href={`/craft/${entry.slug}`}
            className="group grid grid-cols-1 gap-x-10 gap-y-2 py-7 sm:grid-cols-12"
          >
            <div className="sm:col-span-5">
              <h3 className="text-2xl group-hover:text-clay">{entry.name}</h3>
              {entry.local_name ? (
                <p className="spec-value mt-1 text-ink-2">{entry.local_name}</p>
              ) : null}
            </div>
            <div className="sm:col-span-7">
              {entry.description ? (
                <p className="max-w-[58ch] text-ink-2">{entry.description}</p>
              ) : null}
              <p className="spec mt-3">
                {storyCopy.craft.objectCount}: {entry.count}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function CraftPage() {
  const [{ materials, techniques }, newest] = await Promise.all([
    listCraft(),
    listProducts({ sort: "newest" }),
  ]);

  const empty = !materials.length && !techniques.length;

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.craft.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{copy.product.originTrace}</p>
            <h1 className="text-4xl lg:text-5xl">{copy.craft.title}</h1>
          </div>
          <Prose className="lg:col-span-7">
            <p>{copy.craft.intro}</p>
          </Prose>
        </div>
      </Section>

      {empty ? (
        <Section tight className="pt-0">
          <EmptyState
            title={storyCopy.craft.empty}
            action={
              <LinkButton href="/shop" variant="secondary">
                {storyCopy.shared.shopEverything}
              </LinkButton>
            }
          />
        </Section>
      ) : (
        <>
          {materials.length ? (
            <Section tight className="pt-0">
              <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <h2 className="text-3xl">{storyCopy.craft.materialsTitle}</h2>
                  <p className="mt-3 max-w-sm text-ink-2">{storyCopy.craft.materialsIntro}</p>
                </div>
                <div className="lg:col-span-7">
                  <CraftList entries={materials} />
                </div>
              </div>
            </Section>
          ) : null}

          {techniques.length ? (
            <Section tight className="pt-0">
              <Rule className="mb-12" />
              <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
                <div className="lg:col-span-5">
                  <h2 className="text-3xl">{storyCopy.craft.techniquesTitle}</h2>
                  <p className="mt-3 max-w-sm text-ink-2">{storyCopy.craft.techniquesIntro}</p>
                </div>
                <div className="lg:col-span-7">
                  <CraftList entries={techniques} />
                </div>
              </div>
            </Section>
          ) : null}
        </>
      )}

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <ProductRail
          eyebrow={copy.shop.facetMaterial}
          title="Objects made from these materials"
          products={newest.slice(0, 3)}
          action={{ href: "/shop", label: copy.home.viewAll }}
        />
      </Section>
    </>
  );
}
