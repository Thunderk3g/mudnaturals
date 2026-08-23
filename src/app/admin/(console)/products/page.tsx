import Link from "next/link";
import { listAdminProducts } from "@/server/admin";
import { Empty, Explain, Money, PageHeader, Panel, Pill, PublishPill, Table, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

const filterControl =
  "border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const products = await listAdminProducts({ q, status });

  return (
    <>
      <PageHeader
        title="Products"
        meta={`${products.length} shown`}
        actions={
          <Link
            href="/admin/products/new"
            className="border border-clay bg-clay px-3 py-1.5 text-sm text-paper hover:bg-[#9d4826]"
          >
            New product
          </Link>
        }
      />

      <Explain>
        Everything the shop sells, live or not. Open one to change its words, its price, its photographs, or
        whether anyone can see it. A product cannot go live until it says which community it came from.
      </Explain>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="q" className="spec mb-1 block text-ink">
            Search
          </label>
          <input id="q" name="q" defaultValue={q ?? ""} placeholder="name or slug" className={filterControl} />
        </div>
        <div>
          <label htmlFor="status" className="spec mb-1 block text-ink">
            Status
          </label>
          <select id="status" name="status" defaultValue={status ?? ""} className={filterControl}>
            <option value="">Any</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <button type="submit" className="border border-rule-strong px-3 py-1.5 text-sm hover:border-ink">
          Filter
        </button>
        <Link href="/admin/products" className="px-2 py-1.5 text-sm text-ink-2 underline underline-offset-4">
          Reset
        </Link>
      </form>

      <Panel>
        {products.length === 0 ? (
          <Empty>No products match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Status</th>
                <th className={th}>Provenance</th>
                <th className={th}>Category</th>
                <th className={th}>Maker</th>
                <th className={`${th} text-right`}>Variants</th>
                <th className={`${th} text-right`}>Available</th>
                <th className={`${th} text-right`}>Price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-paper-deep">
                  <td className={td}>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {product.name}
                    </Link>
                    <div className="spec">{product.slug}</div>
                  </td>
                  <td className={td}>
                    <PublishPill status={product.status} />
                  </td>
                  <td className={td}>
                    {product.missing.length === 0 ? (
                      <Pill tone="ok">complete</Pill>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {product.missing.map((field) => (
                          <Pill key={field} tone="warn">
                            no {field}
                          </Pill>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={td}>{product.category_name}</td>
                  <td className={td}>{product.maker_name ?? <span className="text-ink-3">—</span>}</td>
                  <td className={numCell}>{product.variant_count}</td>
                  <td className={numCell}>
                    <span className={product.available <= 0 ? "text-bad" : ""}>{product.available}</span>
                  </td>
                  <td className={numCell}>
                    <Money paisa={product.price_paisa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
