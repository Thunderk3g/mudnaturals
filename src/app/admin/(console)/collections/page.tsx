import Link from "next/link";
import { listAdminCollections } from "@/server/admin-cms";
import { ActionForm } from "../../action-form";
import { saveCollectionAction } from "../../cms-actions";
import { Empty, Explain, PageHeader, Panel, PublishPill, Table, td, th } from "../../ui";

/**
 * A collection is a reason to buy now — a season, a theme, a shelf someone
 * curated. Products can be in several, or none, and the order inside one is
 * chosen by hand. That is the whole difference from a category.
 */

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

export default async function CollectionsPage() {
  const collections = await listAdminCollections();

  return (
    <>
      <PageHeader title="Collections" meta={`${collections.length} in total`} />

      <Explain>
        A collection groups products for a reason rather than by what they are — “Winter warmers”,
        “New this month”, “Under 2,000 rupees”. A product can be in several at once. Use a category
        when it is about what the thing <em>is</em>; use a collection when it is about why someone
        would want it now.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Panel title="Start a collection">
          <div className="px-3 py-3">
            <ActionForm action={saveCollectionAction} submitLabel="Create it" variant="primary" size="md">
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-title" className="spec mb-1 block text-ink">
                    Name
                  </label>
                  <input id="new-title" name="title" required placeholder="Winter warmers" className={control} />
                </div>
                <div>
                  <label htmlFor="new-slug" className="spec mb-1 block text-ink">
                    Web address
                  </label>
                  <input
                    id="new-slug"
                    name="slug"
                    required
                    placeholder="winter-warmers"
                    className={`${control} font-mono text-xs`}
                  />
                </div>
                <input type="hidden" name="sort_order" value={collections.length * 10} />
                <input type="hidden" name="status" value="draft" />
                <p className="text-xs leading-relaxed text-ink-2">
                  It starts as a draft with nothing in it. Open it next to add the story, a cover
                  photo, and the products.
                </p>
              </div>
            </ActionForm>
          </div>
        </Panel>

        <Panel title="All collections">
          {collections.length === 0 ? (
            <Empty>No collections yet. Start one on the left.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Web address</th>
                  <th className={th}>Products</th>
                  <th className={th}>Visible</th>
                  <th className={th}>Position</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((collection) => (
                  <tr key={collection.id} className="hover:bg-paper-deep/60">
                    <td className={td}>
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="font-medium text-ink hover:text-clay hover:underline"
                      >
                        {collection.title}
                      </Link>
                      {collection.subtitle ? (
                        <p className="mt-0.5 text-xs text-ink-2">{collection.subtitle}</p>
                      ) : null}
                    </td>
                    <td className={`${td} font-mono text-xs text-ink-2`}>/{collection.slug}</td>
                    <td className={`${td} font-mono tabular-nums`}>{collection.product_count}</td>
                    <td className={td}>
                      <PublishPill status={collection.status} />
                    </td>
                    <td className={`${td} font-mono tabular-nums`}>{collection.sort_order}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
