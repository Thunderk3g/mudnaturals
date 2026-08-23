"use client";

import { BLOCK_SPECS, cta, id as readId, ids as readIds, items as readItems, n as readNumber, s as readString, type Block, type BlockType, type FieldSpec } from "@/lib/blocks";
import { saveBlockAction } from "./cms-actions";
import { ActionForm } from "./action-form";
import { ItemsEditor, MediaPicker, RefPicker, RefsPicker, type MediaOption, type RefOption } from "./pickers";

/**
 * One editor for every kind of section on the site.
 *
 * The fields come from the block's entry in `BLOCK_SPECS`, so adding a section
 * type to the site does not mean writing another screen — and, more to the
 * point, every section is edited the same way, which is most of what makes this
 * console learnable in one sitting.
 */

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="spec mb-1 block text-ink">
      {children}
    </label>
  );
}

function Hint({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-ink-2">{children}</p> : null;
}

function Field({
  field,
  data,
  library,
  options,
}: {
  field: FieldSpec;
  data: Record<string, unknown>;
  library: MediaOption[];
  options: Record<string, RefOption[]>;
}) {
  const fieldId = `f-${field.name}`;

  switch (field.kind) {
    case "text":
      return (
        <div>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <input
            id={fieldId}
            name={field.name}
            defaultValue={readString(data, field.name)}
            placeholder={field.placeholder}
            className={control}
          />
          <Hint>{field.hint}</Hint>
        </div>
      );

    case "textarea":
      return (
        <div>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <textarea
            id={fieldId}
            name={field.name}
            rows={field.rows ?? 4}
            defaultValue={readString(data, field.name)}
            className={control}
          />
          <Hint>{field.hint}</Hint>
        </div>
      );

    case "number":
      return (
        <div>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <input
            id={fieldId}
            name={field.name}
            type="number"
            min={field.min}
            max={field.max}
            defaultValue={readNumber(data, field.name, field.min ?? 0)}
            className={`${control} max-w-28`}
          />
          <Hint>{field.hint}</Hint>
        </div>
      );

    case "select":
      return (
        <div>
          <Label htmlFor={fieldId}>{field.label}</Label>
          <select
            id={fieldId}
            name={field.name}
            defaultValue={readString(data, field.name) || field.options[0].value}
            className={control}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Hint>{field.hint}</Hint>
        </div>
      );

    case "link": {
      const value = cta(data, field.name);
      return (
        <div>
          <Label>{field.label}</Label>
          <div className="flex flex-wrap gap-2">
            <input
              name={`${field.name}.label`}
              defaultValue={value?.label ?? ""}
              placeholder="What the button says"
              className={`${control} min-w-40 flex-1`}
            />
            <input
              name={`${field.name}.href`}
              defaultValue={value?.href ?? ""}
              placeholder="/shop"
              className={`${control} min-w-40 flex-1 font-mono text-xs`}
            />
          </div>
          <Hint>{field.hint ?? "Leave both empty to hide the button."}</Hint>
        </div>
      );
    }

    case "media":
      return (
        <MediaPicker
          name={field.name}
          label={field.label}
          hint={field.hint}
          value={readId(data, field.name)}
          library={library}
        />
      );

    case "ref":
      return (
        <RefPicker
          name={field.name}
          label={field.label}
          hint={field.hint}
          value={readId(data, field.name)}
          options={options[field.source] ?? []}
        />
      );

    case "refs":
      return (
        <RefsPicker
          name={field.name}
          label={field.label}
          hint={field.hint}
          value={readIds(data, field.name)}
          options={options[field.source] ?? []}
        />
      );

    case "items":
      return (
        <ItemsEditor
          name={field.name}
          label={field.label}
          hint={field.hint}
          value={readItems(data, field.name)}
        />
      );
  }
}

export function BlockEditor({
  block,
  library,
  options,
}: {
  block: Block;
  library: MediaOption[];
  options: Record<string, RefOption[]>;
}) {
  const spec = BLOCK_SPECS[block.block_type as BlockType];

  return (
    <ActionForm action={saveBlockAction} submitLabel="Save section" variant="primary" size="md">
      <input type="hidden" name="id" value={block.id} />
      <input type="hidden" name="block_type" value={block.block_type} />
      <input type="hidden" name="page_key" value={block.page_key} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="space-y-4 rounded-sm border border-rule bg-surface p-4">
          {spec.fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              data={block.data}
              library={library}
              options={options}
            />
          ))}
        </div>

        <aside className="space-y-4 rounded-sm border border-rule bg-surface p-4">
          <div>
            <h2 className="font-serif text-base text-ink">Is it live?</h2>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="is_visible"
                defaultChecked={block.is_visible}
                className="mt-0.5 h-4 w-4 accent-[#b4552d]"
              />
              <span>
                Show this section on the site.
                <span className="mt-0.5 block text-xs text-ink-2">
                  Untick it to take the section down without deleting anything.
                </span>
              </span>
            </label>
          </div>

          <div className="border-t border-rule pt-3">
            <h3 className="spec text-ink">What this is</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{spec.description}</p>
          </div>
        </aside>
      </div>
    </ActionForm>
  );
}
