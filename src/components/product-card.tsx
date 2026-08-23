import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/server/queries";
import { formatNpr } from "@/lib/money";
import { Reveal } from "@/components/reveal";
import { ProvenanceLine, Price } from "@/components/ui/spec";
import { copy } from "@/content/copy";

/**
 * Card order is fixed by the design system: image → mono provenance line →
 * serif name → price. The provenance credit sits *above* the name, the way a
 * catalogue credits a maker before it names the object.
 *
 * Hover is one slow push into the photograph (`img-zoom`, 600ms) with the
 * second frame crossing over it where one exists. Both images scale together,
 * so the cross-fade never looks like two separate pictures.
 */
export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const soldOut = product.available <= 0;

  return (
    <Link href={`/products/${product.slug}`} className="group block focus-visible:outline-offset-4">
      <div className="relative aspect-4/5 overflow-hidden bg-paper-deep">
        {product.image ? (
          <>
            <Image
              src={product.image.storage_path}
              alt={product.image.alt}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={priority}
              className={`img-zoom object-cover ${product.hover_image ? "group-hover:opacity-0" : ""}`}
            />
            {product.hover_image ? (
              <Image
                src={product.hover_image.storage_path}
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="img-zoom object-cover opacity-0 group-hover:opacity-100"
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="spec">No image</span>
          </div>
        )}

        {soldOut ? (
          <span className="absolute left-0 top-0 bg-paper/90 px-3 py-1.5 spec text-ink">
            {copy.product.soldOut}
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <ProvenanceLine
          community={product.community_name}
          maker={product.maker_name}
          district={product.district}
        />
        <h3 className="mt-1.5 text-lg leading-snug transition-colors duration-400 group-hover:text-clay">
          {product.name}
        </h3>
        <p className="mt-1">
          <Price muted={soldOut}>{formatNpr(product.price_paisa)}</Price>
        </p>
      </div>
    </Link>
  );
}

/**
 * Three columns maximum on desktop, two on mobile. Never four.
 *
 * The grid is itself the reveal target, so the cards arrive one after another
 * rather than the block appearing whole. Grids already on screen at first paint
 * are left alone by `Reveal`, so nothing above the fold waits for JavaScript.
 */
export function ProductGrid({
  products,
  columns = 3,
}: {
  products: ProductCardData[];
  columns?: 2 | 3;
}) {
  return (
    <Reveal
      stagger
      className={`grid grid-cols-2 gap-x-5 gap-y-12 lg:gap-x-8 ${
        columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
      }`}
    >
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 3} />
      ))}
    </Reveal>
  );
}

/**
 * The ledger view: every object as a record. Adopted from the rejected T3
 * territory because it is the display that survives inconsistent photography
 * best, and because provenance-as-data is the brand's whole argument.
 */
export function ProductLedger({ products }: { products: ProductCardData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-rule-strong">
            <th className="spec py-3 pr-4">Object</th>
            <th className="spec py-3 pr-4">Maker</th>
            <th className="spec py-3 pr-4">Material</th>
            <th className="spec py-3 pr-4">Stock</th>
            <th className="spec py-3 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-rule hover:bg-paper-deep/60">
              <td className="py-3 pr-4">
                <Link href={`/products/${product.slug}`} className="hover:text-clay">
                  {product.name}
                </Link>
              </td>
              <td className="spec-value py-3 pr-4 text-ink-2">{product.maker_name ?? "—"}</td>
              <td className="spec-value py-3 pr-4 text-ink-2">{product.material_name ?? "—"}</td>
              <td className="spec-value py-3 pr-4 tabular-nums text-ink-2">
                {product.available > 0 ? product.available : "—"}
              </td>
              <td className="py-3 text-right">
                <Price muted={product.available <= 0}>{formatNpr(product.price_paisa)}</Price>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
