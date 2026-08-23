import { notFound } from "next/navigation";
import { getAdminCollection, getPickerOptions, listMedia } from "@/server/admin-cms";
import { ActionForm } from "../../../action-form";
import { deleteCollectionAction, saveCollectionAction } from "../../../cms-actions";
import { MediaPicker, RefsPicker } from "../../../pickers";
import { Crumbs, Explain, PageHeader, PublishPill } from "../../../ui";

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [collection, media, options] = await Promise.all([
    getAdminCollection(id).catch(() => null),
    listMedia(),
    getPickerOptions(),
  ]);

  if (!collection) notFound();

  return (
    <>
      <PageHeader
        title={collection.title}
        crumbs={
          <Crumbs
            trail={[{ label: "Collections", href: "/admin/collections" }, { label: collection.title }]}
          />
        }
        meta={<PublishPill status={collection.status} />}
        actions={
          <>
            <a
              href={`/collections/${collection.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors hover:border-ink hover:bg-surface"
            >
              View on the site ↗
            </a>
            <ActionForm
              action={deleteCollectionAction}
              submitLabel="Delete"
              variant="danger"
              compact
              confirm={`Delete “${collection.title}”? The products stay in the shop; only the grouping is removed.`}
            >
              <input type="hidden" name="id" value={collection.id} />
            </ActionForm>
          </>
        }
      />

      <Explain>
        The order you put the products in below is the order visitors see them. Nothing here changes
        a product itself — a collection only decides which products are grouped together and how the
        group is introduced.
      </Explain>

      <ActionForm action={saveCollectionAction} submitLabel="Save collection" variant="primary" size="md">
        <input type="hidden" name="id" value={collection.id} />

        <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="space-y-4 rounded-sm border border-rule bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="f-title" className="spec mb-1 block text-ink">
                  Name
                </label>
                <input id="f-title" name="title" defaultValue={collection.title} required className={control} />
              </div>
              <div>
                <label htmlFor="f-slug" className="spec mb-1 block text-ink">
                  Web address
                </label>
                <input
                  id="f-slug"
                  name="slug"
                  defaultValue={collection.slug}
                  required
                  className={`${control} font-mono text-xs`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="f-subtitle" className="spec mb-1 block text-ink">
                One line under the name
              </label>
              <input
                id="f-subtitle"
                name="subtitle"
                defaultValue={collection.subtitle ?? ""}
                className={control}
              />
            </div>

            <div>
              <label htmlFor="f-story" className="spec mb-1 block text-ink">
                The story
              </label>
              <textarea
                id="f-story"
                name="story"
                rows={6}
                defaultValue={collection.story ?? ""}
                className={control}
              />
              <p className="mt-1 text-xs text-ink-2">
                A paragraph or two, shown above the products. Press Enter twice to start a new
                paragraph.
              </p>
            </div>

            <RefsPicker
              name="product_ids"
              label="Products in this collection"
              hint="This order is the order on the site. Use the arrows to change it."
              value={collection.products.map((p) => p.id)}
              options={options.product}
            />
          </div>

          <aside className="space-y-4 rounded-sm border border-rule bg-surface p-4">
            <div>
              <label htmlFor="f-status" className="spec mb-1 block text-ink">
                Visible on the site
              </label>
              <select id="f-status" name="status" defaultValue={collection.status} className={control}>
                <option value="published">Yes — anyone can see it</option>
                <option value="draft">No — draft, hidden</option>
                <option value="archived">No — archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-sort" className="spec mb-1 block text-ink">
                Position
              </label>
              <input
                id="f-sort"
                name="sort_order"
                type="number"
                defaultValue={collection.sort_order}
                className={`${control} max-w-24`}
              />
              <p className="mt-1 text-xs text-ink-2">Lower numbers come first.</p>
            </div>

            <div className="border-t border-rule pt-4">
              <MediaPicker
                name="cover_image_id"
                label="Cover photo"
                hint="Used wherever the collection is featured, including on the homepage."
                value={collection.cover_image_id}
                library={media.map((m) => ({ id: m.id, filename: m.filename, alt: m.alt }))}
              />
              {!collection.cover_image_id && collection.cover_image ? (
                <p className="mt-2 text-xs text-ink-2">
                  Currently using the shipped image{" "}
                  <code className="font-mono">{collection.cover_image}</code>. Choosing a photo
                  above replaces it.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </ActionForm>
    </>
  );
}
