import { SectionHeader, EmptyState } from "@/components/ui/layout";
import { LinkButton } from "@/components/ui/button";
import { ProductGrid } from "@/components/product-card";
import type { ProductCard as ProductCardData } from "@/server/queries";
import { storyCopy } from "@/content/story-copy";

/**
 * The rule that makes a story surface shoppable, and the one defect this site
 * is built to avoid: there are no leaf nodes. Every maker, craft, collection
 * and journal page ends in objects you can buy, and when a record happens to
 * have none in stock the rail still routes to the shop rather than dead-ending.
 */
export function ProductRail({
  title,
  eyebrow,
  body,
  products,
  action,
  columns = 3,
}: {
  title: string;
  eyebrow?: string;
  body?: string;
  products: ProductCardData[];
  action?: { href: string; label: string };
  columns?: 2 | 3;
}) {
  return (
    <section aria-label={title}>
      <SectionHeader eyebrow={eyebrow} title={title} body={body} action={action} />
      {products.length ? (
        <ProductGrid products={products} columns={columns} />
      ) : (
        <EmptyState
          title={storyCopy.shared.railEmpty}
          body={storyCopy.shared.railEmptyBody}
          action={
            <LinkButton href="/shop" variant="secondary">
              {storyCopy.shared.shopEverything}
            </LinkButton>
          }
        />
      )}
    </section>
  );
}
