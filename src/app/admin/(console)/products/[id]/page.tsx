import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormOptions, getProductForEdit, type VariantForEdit } from "@/server/admin";
import { saveProductAction } from "../../../actions";
import { ActionForm } from "../../../action-form";
import { Check, Field, Note, PageHeader, Panel, Pill, PublishPill, Select, TextArea, td, th } from "../../../ui";

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

  const [existing, options] = await Promise.all([
    isNew ? Promise.resolve(null) : getProductForEdit(id),
    getFormOptions(),
  ]);
  if (!isNew && !existing) notFound();

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
        meta={
          product ? (
            <div className="flex items-center gap-2">
              <PublishPill status={product.status} />
              <span className="spec">{product.slug}</span>
            </div>
          ) : (
            "Provenance first, then publish."
          )
        }
        actions={
          <Link href="/admin/products" className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay">
            ← All products
          </Link>
        }
      />

      {missing.length ? (
        <Note tone="warn">
          Publish is blocked: this product still has no{" "}
          <strong>{missing.join(", ")}</strong>. Set{" "}
          {missing.length === 1 ? "it" : "them"} and save, then the status can move to published.
        </Note>
      ) : (
        <Note tone="ok">Provenance complete — maker, community, material and technique are all set.</Note>
      )}

      <ActionForm action={saveProductAction} submitLabel="Save product" variant="primary" size="md" className="mt-4">
        {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Identity">
            <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
              <Field label="Name" name="name" required defaultValue={product?.name ?? ""} />
              <Field
                label="Slug"
                name="slug"
                required
                defaultValue={product?.slug ?? ""}
                hint="lowercase-with-hyphens"
              />
              <Field label="Subtitle" name="subtitle" defaultValue={product?.subtitle ?? ""} className="sm:col-span-2" />
              <Select label="Category" name="category_id" required defaultValue={product?.category_id ?? ""}>
                <option value="">Choose…</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Status"
                name="status"
                defaultValue={product?.status ?? "draft"}
                hint={missing.length ? "Published is disabled until provenance is complete." : undefined}
              >
                <option value="draft">draft</option>
                <option value="published" disabled={missing.length > 0}>
                  published
                </option>
                <option value="archived">archived</option>
              </Select>
              <div className="sm:col-span-2">
                <Check label="Food product (is_food)" name="is_food" defaultChecked={product?.is_food ?? false} />
              </div>
            </div>
          </Panel>

          <Panel title="Provenance — required before publish">
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
                label="Labour hours"
                name="labour_hours"
                type="number"
                step="0.1"
                min="0.1"
                defaultValue={product?.labour_hours ?? ""}
              />
              <Field
                label="Variation note"
                name="variation_note"
                defaultValue={product?.variation_note ?? ""}
                hint="Expected handmade variation, stated as a spec."
              />
            </div>
          </Panel>

          <Panel title="Money (entered in rupees)">
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
                label="Compare at (Rs)"
                name="compare_at_rupees"
                type="number"
                step="0.01"
                defaultValue={rupees(product?.compare_at_paisa)}
              />
              <Field
                label="Maker share (Rs)"
                name="maker_share_rupees"
                type="number"
                step="0.01"
                defaultValue={rupees(product?.maker_share_paisa)}
                hint="Leave blank to hide the impact module on the storefront."
              />
            </div>
          </Panel>

          <Panel title="Copy">
            <div className="grid gap-3 px-3 py-3">
              <TextArea label="Description" name="description" rows={5} defaultValue={product?.description ?? ""} />
              <TextArea label="Care" name="care" rows={3} defaultValue={product?.care ?? ""} />
            </div>
          </Panel>
        </div>

        <Panel title="Variants — exactly one default" className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Default</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Option name</th>
                  <th className={th}>Option value</th>
                  <th className={th}>Price override (Rs)</th>
                  <th className={th}>Available</th>
                  <th className={th}>Remove</th>
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
            Blank SKU rows are ignored. Stock is never edited here — it moves only through{" "}
            <Link href="/admin/stock" className="underline underline-offset-4">
              intake
            </Link>
            .
          </p>
        </Panel>
      </ActionForm>
    </>
  );
}
