import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormOptions, getProductForEdit, type VariantForEdit } from "@/server/admin";
import { listMedia, listProductImages } from "@/server/admin-cms";
import { saveProductAction } from "../../../actions";
import {
  addProductImageAction,
  moveProductImageAction,
  removeProductImageAction,
  updateProductImageAltAction,
} from "../../../cms-actions";
import { ActionForm } from "../../../action-form";
import { MediaPicker } from "../../../pickers";
import { Check, Crumbs, Empty, Explain, Field, Note, PageHeader, Panel, Pill, PublishPill, Select, TextArea, td, th } from "../../../ui";

export const dynamic = "force-dynamic";

const BLANK: VariantForEdit = {
  id: "",
  sku: "",
  option_name: null,
  option_value: null,
  price_paisa: null,
  is_default: false,
  available: 0,
};

const rupees = (paisa: number | null | undefined) => (paisa == null ? "" : (paisa / 100).toFixed(2));

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";

  const [existing, options, images, media] = await Promise.all([
    isNew ? Promise.resolve(null) : getProductForEdit(id),
    getFormOptions(),
    isNew ? Promise.resolve([]) : listProductImages(id),
    listMedia(),
  ]);
  if (!isNew && !existing) notFound();

  const library = media.map((m) => ({ id: m.id, filename: m.filename, alt: m.alt }));

  const product = existing?.product ?? null;
  const variants = existing?.variants ?? [];

  // The DB refuses to publish without all four (products_provenance_required_to_publish).
  // Say so up front instead of letting the operator discover it on save.
  const missing = (
    [
      ["maker", product?.maker_id],
      ["community", product?.community_id],
      ["material", product?.material_id],
      ["technique", product?.technique_id],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([label]) => label);

  const rows: (VariantForEdit & { key: string })[] = [
    ...variants.map((variant) => ({ ...variant, key: variant.id })),
    { ...BLANK, key: "new-0" },
    { ...BLANK, key: "new-1" },
  ];
  const defaultKey = variants.find((variant) => variant.is_default)?.id ?? rows[0]?.key;

  return (
    <>
      <PageHeader
        title={isNew ? "New product" : (product?.name ?? "")}
        crumbs={
          <Crumbs
            trail={[
              { label: "Products", href: "/admin/products" },
              { label: isNew ? "New product" : (product?.name ?? "") },
            ]}
          />
        }
        meta={
          product ? (
            <div className="flex items-center gap-2">
              <PublishPill status={product.status} />
              <span className="spec">{product.slug}</span>
            </div>
          ) : (
            "Fill in where it comes from first — the shop will not publish it otherwise."
          )
        }
        actions={
          product?.status === "published" ? (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors hover:border-ink hover:bg-surface"
            >
              View on the site ↗
            </a>
          ) : null
        }
      />

      {missing.length ? (
        <Note tone="warn">
          This cannot go live yet: it still has no <strong>{missing.join(", ")}</strong>. Fill{" "}
          {missing.length === 1 ? "it" : "them"} in below and save, then you can set it to live.
        </Note>
      ) : (
        <Note tone="ok">
          Everything needed is filled in — maker, community, material and technique. This product
          can go live.
        </Note>
      )}

      <ActionForm action={saveProductAction} submitLabel="Save product" variant="primary" size="md" className="mt-4">
        {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="The basics">
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
              <Field label="Name" name="name" required defaultValue={product?.name ?? ""} />
              <Field
                label="Web address"
                name="slug"
                required
                defaultValue={product?.slug ?? ""}
                hint="Lowercase words joined by hyphens. Changing it breaks old links."
              />
              <Field
                label="One line under the name"
                name="subtitle"
                defaultValue={product?.subtitle ?? ""}
                className="sm:col-span-2"
              />
              <Select label="Category" name="category_id" required defaultValue={product?.category_id ?? ""}>
                <option value="">Choose…</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Visible on the site"
                name="status"
                defaultValue={product?.status ?? "draft"}
                hint={missing.length ? "Cannot go live until the section beside this one is filled in." : undefined}
              >
                <option value="draft">No — draft, hidden</option>
                <option value="published" disabled={missing.length > 0}>
                  Yes — anyone can buy it
                </option>
                <option value="archived">No — archived</option>
              </Select>
              <div className="sm:col-span-2">
                <Check
                  label="This is food or something edible"
                  name="is_food"
                  defaultChecked={product?.is_food ?? false}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Where it comes from — needed before it can go live">
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
              <Select label="Maker" name="maker_id" defaultValue={product?.maker_id ?? ""}>
                <option value="">— none —</option>
                {options.makers.map((maker) => (
                  <option key={maker.id} value={maker.id}>
                    {maker.name}
                  </option>
                ))}
              </Select>
              <Select label="Community" name="community_id" defaultValue={product?.community_id ?? ""}>
                <option value="">— none —</option>
                {options.communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </Select>
              <Select label="Material" name="material_id" defaultValue={product?.material_id ?? ""}>
                <option value="">— none —</option>
                {options.materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </Select>
              <Select label="Technique" name="technique_id" defaultValue={product?.technique_id ?? ""}>
                <option value="">— none —</option>
                {options.techniques.map((technique) => (
                  <option key={technique.id} value={technique.id}>
                    {technique.name}
                  </option>
                ))}
              </Select>
              <Field
                label="Hours of work"
                name="labour_hours"
                type="number"
                step="0.1"
                min="0.1"
                defaultValue={product?.labour_hours ?? ""}
                hint="Roughly how long one takes to make."
              />
              <Field
                label="How they differ"
                name="variation_note"
                defaultValue={product?.variation_note ?? ""}
                hint="What varies between two of these, said plainly. Sets the buyer's expectation."
              />
            </div>
          </Panel>

          <Panel title="Price">
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-3">
              <Field
                label="Price (Rs)"
                name="price_rupees"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={rupees(product?.price_paisa)}
              />
              <Field
                label="Was (Rs)"
                name="compare_at_rupees"
                type="number"
                step="0.01"
                defaultValue={rupees(product?.compare_at_paisa)}
                hint="Shown struck through. Leave blank if it is not on offer."
              />
              <Field
                label="Goes to the maker (Rs)"
                name="maker_share_rupees"
                type="number"
                step="0.01"
                defaultValue={rupees(product?.maker_share_paisa)}
                hint="Leave blank and the site says nothing about it, rather than showing a placeholder."
              />
            </div>
          </Panel>

          <Panel title="Words on the page">
            <div className="grid gap-3 px-3 py-3">
              <TextArea
                label="Description"
                name="description"
                rows={5}
                defaultValue={product?.description ?? ""}
              />
              <TextArea
                label="Looking after it"
                name="care"
                rows={3}
                defaultValue={product?.care ?? ""}
                hint="Washing, storing, what to avoid."
              />
            </div>
          </Panel>
        </div>

        <Panel title="Options and prices" className="mt-4">
          <p className="border-b border-rule px-3 py-2 text-xs leading-relaxed text-ink-2">
            One row per version a customer can buy — a size, a colour, a weight. If there is only
            one version, fill in a single row with a code and leave the option boxes empty. Exactly
            one row is shown first.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Shown first</th>
                  <th className={th}>Stock code</th>
                  <th className={th}>Option</th>
                  <th className={th}>Value</th>
                  <th className={th}>Its own price (Rs)</th>
                  <th className={th}>In stock</th>
                  <th className={th}>Delete</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className={td}>
                      <input type="hidden" name="variant_key" value={row.key} />
                      <input
                        type="radio"
                        name="default_variant"
                        value={row.key}
                        defaultChecked={row.key === defaultKey}
                        aria-label={`Make ${row.sku || "this new variant"} the default`}
                        className="h-4 w-4 accent-[#b4552d]"
                      />
                    </td>
                    <td className={td}>
                      <input
                        name="variant_sku"
                        defaultValue={row.sku}
                        aria-label="SKU"
                        className="w-40 border border-rule-strong bg-surface px-2 py-1 font-mono text-xs focus:border-ink focus:outline-none"
                      />
                    </td>
                    <td className={td}>
                      <input
                        name="variant_option_name"
                        defaultValue={row.option_name ?? ""}
                        aria-label="Option name"
                        className="w-28 border border-rule-strong bg-surface px-2 py-1 text-xs focus:border-ink focus:outline-none"
                      />
                    </td>
                    <td className={td}>
                      <input
                        name="variant_option_value"
                        defaultValue={row.option_value ?? ""}
                        aria-label="Option value"
                        className="w-28 border border-rule-strong bg-surface px-2 py-1 text-xs focus:border-ink focus:outline-none"
                      />
                    </td>
                    <td className={td}>
                      <input
                        name="variant_price"
                        type="number"
                        step="0.01"
                        defaultValue={rupees(row.price_paisa)}
                        aria-label="Price override in rupees"
                        className="w-28 border border-rule-strong bg-surface px-2 py-1 text-right font-mono text-xs focus:border-ink focus:outline-none"
                      />
                    </td>
                    <td className={`${td} font-mono tabular-nums`}>{row.id ? row.available : "—"}</td>
                    <td className={td}>
                      {row.id ? (
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            name={`variant_remove_${row.key}`}
                            className="h-4 w-4 accent-[#b4552d]"
                          />
                          delete
                        </label>
                      ) : (
                        <Pill>new</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-rule px-3 py-2 text-xs text-ink-2">
            Rows with no stock code are ignored. Stock counts are never typed here — they only move
            when you{" "}
            <Link href="/admin/stock" className="underline underline-offset-4">
              record what arrived
            </Link>
            .
          </p>
        </Panel>
      </ActionForm>

      {product ? (
        <Panel title="Photographs" className="mt-5">
          <div className="px-3 py-3">
            <Explain>
              The first photograph is the one shown everywhere the product is listed. The second is
              what appears when someone hovers over it. Use the arrows to change the order.
            </Explain>

            {images.length === 0 ? (
              <Empty>
                No photographs yet. Choose one from the library below, or upload a new file — it is
                added to the library at the same time.
              </Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {images.map((image, index) => (
                  <li key={image.id} className="rounded-sm border border-rule p-3">
                    <div className="flex gap-3">
                      <div className="h-28 w-[90px] shrink-0 overflow-hidden rounded-sm border border-rule">
                        {/* eslint-disable-next-line @next/next/no-img-element -- console
                            thumbnail; see the note in pickers.tsx. */}
                        <img
                          src={image.media_id ? `/api/media/${image.media_id}` : (image.storage_path ?? "")}
                          alt={image.alt}
                          loading="lazy"
                          className="h-full w-full bg-paper-deep object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="spec">
                          {index === 0 ? "Main photograph" : index === 1 ? "Shown on hover" : `Photo ${index + 1}`}
                        </p>
                        <div className="mt-2 flex gap-1">
                          <ActionForm action={moveProductImageAction} submitLabel="↑" compact>
                            <input type="hidden" name="id" value={image.id} />
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="direction" value="up" />
                          </ActionForm>
                          <ActionForm action={moveProductImageAction} submitLabel="↓" compact>
                            <input type="hidden" name="id" value={image.id} />
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="direction" value="down" />
                          </ActionForm>
                          <ActionForm
                            action={removeProductImageAction}
                            submitLabel="Remove"
                            variant="danger"
                            compact
                            confirm="Remove this photograph from the product? It stays in the library."
                          >
                            <input type="hidden" name="id" value={image.id} />
                            <input type="hidden" name="product_id" value={product.id} />
                          </ActionForm>
                        </div>
                      </div>
                    </div>

                    <ActionForm action={updateProductImageAltAction} submitLabel="Save description" className="mt-3">
                      <input type="hidden" name="id" value={image.id} />
                      <input type="hidden" name="product_id" value={product.id} />
                      <label htmlFor={`alt-${image.id}`} className="spec mb-1 block text-ink">
                        Description
                      </label>
                      <input
                        id={`alt-${image.id}`}
                        name="alt"
                        defaultValue={image.alt}
                        required
                        className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
                      />
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 border-t border-rule pt-4">
              <ActionForm
                action={addProductImageAction}
                submitLabel="Add photograph"
                variant="primary"
                size="md"
              >
                <input type="hidden" name="product_id" value={product.id} />
                <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                  <MediaPicker
                    name="media_id"
                    label="Choose or upload"
                    value={null}
                    library={library}
                  />
                  <div>
                    <label htmlFor="new-image-alt" className="spec mb-1 block text-ink">
                      Describe what is in it
                    </label>
                    <input
                      id="new-image-alt"
                      name="alt"
                      placeholder="The bag photographed from the front on a plain ground"
                      className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-ink-2">
                      Read aloud by screen readers, and shown if the photo fails to load.
                    </p>
                  </div>
                </div>
              </ActionForm>
            </div>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
