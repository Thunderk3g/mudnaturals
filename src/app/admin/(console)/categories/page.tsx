import { listAdminCategories, listMedia } from "@/server/admin-cms";
import { ActionForm } from "../../action-form";
import { deleteCategoryAction, saveCategoryAction } from "../../cms-actions";
import { MediaPicker } from "../../pickers";
import { Empty, Explain, PageHeader, Panel, PublishPill } from "../../ui";

/**
 * Categories are what a thing *is* — the part of the shop it lives in and the
 * breadcrumb above it. Every product has exactly one.
 *
 * Each row is its own form so a change is saved on its own; there is no
 * page-wide save button that could quietly discard an edit two rows up.
 */

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

export default async function CategoriesPage() {
  const [categories, media] = await Promise.all([listAdminCategories(), listMedia()]);
  const library = media.map((m) => ({ id: m.id, filename: m.filename, alt: m.alt }));

  return (
    <>
      <PageHeader title="Categories" meta={`${categories.length} in the shop`} />

      <Explain>
        A category is the part of the shop a product lives in — Craft &amp; Home, Oils, Food. Every
        product sits in exactly one. The order below is the order they appear on the site and in the
        menu. A category set to <strong>draft</strong> is hidden from visitors along with everything
        in it.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
        <Panel title="Add a category">
          <div className="px-3 py-3">
            <ActionForm action={saveCategoryAction} submitLabel="Add it" variant="primary" size="md">
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-name" className="spec mb-1 block text-ink">
                    Name
                  </label>
                  <input id="new-name" name="name" required placeholder="Oils & Balms" className={control} />
                </div>
                <div>
                  <label htmlFor="new-slug" className="spec mb-1 block text-ink">
                    Web address
                  </label>
                  <input
                    id="new-slug"
                    name="slug"
                    required
                    placeholder="oils-and-balms"
                    className={`${control} font-mono text-xs`}
                  />
                  <p className="mt-1 text-xs text-ink-2">
                    Lowercase words joined by hyphens. Becomes /shop/oils-and-balms.
                  </p>
                </div>
                <div>
                  <label htmlFor="new-description" className="spec mb-1 block text-ink">
                    One line about it
                  </label>
                  <textarea id="new-description" name="description" rows={2} className={control} />
                </div>
                <input type="hidden" name="sort_order" value={categories.length * 10} />
                <input type="hidden" name="status" value="draft" />
                <p className="text-xs leading-relaxed text-ink-2">
                  New categories start as a draft. Publish it below once it has products.
                </p>
              </div>
            </ActionForm>
          </div>
        </Panel>

        <Panel title="Categories, in the order they appear">
          {categories.length === 0 ? (
            <Empty>No categories yet. Add the first one on the left.</Empty>
          ) : (
            <ul>
              {categories.map((category) => (
                <li key={category.id} className="border-b border-rule px-3 py-4 last:border-b-0">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-lg text-ink">{category.name}</h3>
                    <PublishPill status={category.status} />
                    <span className="spec">
                      {category.product_count} product{category.product_count === 1 ? "" : "s"}
                    </span>
                  </div>

                  <ActionForm action={saveCategoryAction} submitLabel="Save" size="md">
                    <input type="hidden" name="id" value={category.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`name-${category.id}`} className="spec mb-1 block text-ink">
                          Name
                        </label>
                        <input
                          id={`name-${category.id}`}
                          name="name"
                          defaultValue={category.name}
                          required
                          className={control}
                        />
                      </div>
                      <div>
                        <label htmlFor={`slug-${category.id}`} className="spec mb-1 block text-ink">
                          Web address
                        </label>
                        <input
                          id={`slug-${category.id}`}
                          name="slug"
                          defaultValue={category.slug}
                          required
                          className={`${control} font-mono text-xs`}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`desc-${category.id}`} className="spec mb-1 block text-ink">
                          One line about it
                        </label>
                        <textarea
                          id={`desc-${category.id}`}
                          name="description"
                          rows={2}
                          defaultValue={category.description ?? ""}
                          className={control}
                        />
                      </div>
                      <div>
                        <label htmlFor={`status-${category.id}`} className="spec mb-1 block text-ink">
                          Visible on the site
                        </label>
                        <select
                          id={`status-${category.id}`}
                          name="status"
                          defaultValue={category.status}
                          className={control}
                        >
                          <option value="published">Yes — anyone can see it</option>
                          <option value="draft">No — draft, hidden</option>
                          <option value="archived">No — archived</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`sort-${category.id}`} className="spec mb-1 block text-ink">
                          Position
                        </label>
                        <input
                          id={`sort-${category.id}`}
                          name="sort_order"
                          type="number"
                          defaultValue={category.sort_order}
                          className={`${control} max-w-24`}
                        />
                        <p className="mt-1 text-xs text-ink-2">Lower numbers come first.</p>
                      </div>
                      <div className="sm:col-span-2">
                        <MediaPicker
                          name="image_id"
                          label="Photo"
                          hint="Shown on the shop index and anywhere the category is listed with a picture."
                          value={category.image_id}
                          library={library}
                        />
                      </div>
                    </div>
                  </ActionForm>

                  {category.product_count === 0 ? (
                    <ActionForm
                      action={deleteCategoryAction}
                      submitLabel="Delete this category"
                      variant="danger"
                      confirm={`Delete “${category.name}”?`}
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={category.id} />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
