import { SpecList, type SpecItem } from "@/components/ui/spec";
import { copy } from "@/content/copy";
import { productCopy } from "@/content/product-copy";
import type { ProductDetail } from "@/server/queries";

/**
 * The specimen label. Four facts, each one a door: maker, community, material,
 * time. The disclosure carries the rest of the chain — district, technique, and
 * the path written out end to end. Rows with no value are dropped by SpecList,
 * so a missing `labour_hours` prints nothing rather than a placeholder.
 */
export function OriginTrace({ product }: { product: ProductDetail }) {
  const primary: SpecItem[] = [
    {
      label: copy.product.maker,
      value: product.maker_name,
      href: product.maker_slug ? `/makers/${product.maker_slug}` : undefined,
    },
    { label: copy.product.community, value: product.community_name },
    {
      label: copy.product.material,
      value: product.material_name,
      href: product.material_slug ? `/craft/${product.material_slug}` : undefined,
    },
    ...(product.labour_hours != null
      ? [{ label: productCopy.time, value: productCopy.hours(product.labour_hours) }]
      : []),
  ];

  const detail: SpecItem[] = [
    { label: copy.product.district, value: product.district },
    {
      label: copy.product.technique,
      value: product.technique_name,
      href: product.technique_slug ? `/craft/${product.technique_slug}` : undefined,
    },
  ];

  const path = [
    product.material_name,
    product.district ? `${product.community_name ?? ""} ${product.district}`.trim() : product.community_name,
    product.technique_name,
    product.maker_name,
    product.labour_hours != null ? productCopy.hours(product.labour_hours) : null,
  ].filter(Boolean);

  return (
    <section aria-labelledby="origin-trace" className="mt-8 border border-rule-strong p-5">
      <h2 id="origin-trace" className="spec text-ink">
        {copy.product.originTrace}
      </h2>

      <SpecList items={primary} className="mt-3" />

      <details className="group mt-3 border-t border-rule pt-3">
        <summary className="spec flex cursor-pointer list-none items-center justify-between text-ink hover:text-clay [&::-webkit-details-marker]:hidden">
          {productCopy.originExpand}
          <span aria-hidden className="ml-3">
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </summary>

        <SpecList items={detail} className="mt-2" />

        {path.length > 1 ? (
          <p className="spec-value mt-3 leading-relaxed text-ink-2">{path.join(" → ")}</p>
        ) : null}
      </details>
    </section>
  );
}
