"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { uploadMediaInline } from "./cms-actions";

/**
 * The four inputs the console needs that a plain `<input>` cannot be: choosing
 * a photo, choosing a record, choosing several records in an order, and
 * repeating a pair of fields.
 *
 * All four submit through hidden inputs inside whatever form contains them, so
 * the server action reads ordinary FormData and knows nothing about any of
 * this. Nothing here holds a draft that could be lost — the visible state is
 * the state that will be saved.
 */

export type MediaOption = { id: string; filename: string; alt: string };
export type RefOption = { id: string; name: string };

/* ------------------------------------------------------------ photo picker */

function Thumb({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  // Console thumbnails only. Running the whole library through the image
  // optimiser would cost a transform per grid item for pictures no customer
  // ever sees.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/media/${id}`}
      alt={alt}
      loading="lazy"
      className={`bg-paper-deep object-cover ${className}`}
    />
  );
}

export function MediaPicker({
  name,
  label,
  hint,
  value,
  library,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string | null;
  library: MediaOption[];
}) {
  const [selected, setSelected] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [known, setKnown] = useState<MediaOption[]>(library);
  const current = known.find((m) => m.id === selected) ?? null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return known;
    return known.filter(
      (m) => m.filename.toLowerCase().includes(q) || m.alt.toLowerCase().includes(q)
    );
  }, [known, query]);

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const result = await uploadMediaInline(fd);
      if (result.error || !result.id) {
        setError(result.error ?? "That upload did not work.");
        return;
      }
      setKnown((prev) =>
        prev.some((m) => m.id === result.id)
          ? prev
          : [{ id: result.id!, filename: file.name, alt: "" }, ...prev]
      );
      setSelected(result.id);
      setOpen(false);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div>
      <span className="spec mb-1 block text-ink">{label}</span>
      <input type="hidden" name={name} value={selected ?? ""} />

      <div className="flex items-start gap-3">
        <div className="h-[72px] w-[58px] shrink-0 overflow-hidden rounded-sm border border-rule">
          {selected ? (
            <Thumb id={selected} alt={current?.alt ?? ""} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-paper-deep text-[0.625rem] text-ink-3">
              None
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">
            {selected ? current?.filename ?? "Chosen photo" : "No photo chosen"}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-sm border border-rule-strong px-2.5 py-1 text-xs text-ink transition-colors hover:border-ink hover:bg-paper-deep"
            >
              {open ? "Close" : selected ? "Change photo" : "Choose photo"}
            </button>
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-sm border border-rule-strong px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-bad hover:text-bad"
              >
                Remove
              </button>
            ) : null}
          </div>
          {hint ? <p className="mt-1.5 text-xs text-ink-2">{hint}</p> : null}
        </div>
      </div>

      {open ? (
        <div className="mt-3 rounded-sm border border-rule bg-paper-deep p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search photos"
              className="min-w-40 flex-1 rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="max-w-52 text-xs text-ink-2 file:mr-2 file:rounded-sm file:border file:border-rule-strong file:bg-surface file:px-2 file:py-1 file:text-xs"
            />
            <button
              type="button"
              onClick={upload}
              disabled={pending}
              className="rounded-sm border border-clay bg-clay px-2.5 py-1.5 text-xs text-paper transition-opacity disabled:opacity-50"
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
          </div>

          {error ? (
            <p role="alert" className="mt-2 text-xs font-medium text-bad">
              {error}
            </p>
          ) : null}

          {shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-2">
              No photos yet. Upload one above.
            </p>
          ) : (
            <ul className="mt-3 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {shown.map((media) => (
                <li key={media.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(media.id);
                      setOpen(false);
                    }}
                    title={media.filename}
                    className={`block aspect-4/5 w-full overflow-hidden rounded-sm border-2 transition-colors ${
                      media.id === selected ? "border-clay" : "border-transparent hover:border-ink"
                    }`}
                  >
                    <Thumb id={media.id} alt={media.alt || media.filename} className="h-full w-full" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- record picker */

export function RefPicker({
  name,
  label,
  hint,
  value,
  options,
  emptyLabel = "Choose automatically",
}: {
  name: string;
  label: string;
  hint?: string;
  value: string | null;
  options: RefOption[];
  emptyLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="spec mb-1 block text-ink">
        {label}
      </label>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={value ?? ""}
        className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

/**
 * An ordered subset of records. The order on screen is the order that is saved,
 * which is why this exists instead of a multi-select — a browser multi-select
 * submits in document order and silently discards whatever the operator
 * intended.
 */
export function RefsPicker({
  name,
  label,
  hint,
  value,
  options,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string[];
  options: RefOption[];
}) {
  const [chosen, setChosen] = useState<string[]>(value.filter((id) => options.some((o) => o.id === id)));

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o.name])), [options]);
  const available = options.filter((o) => !chosen.includes(o.id));

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= chosen.length) return;
    const next = [...chosen];
    [next[index], next[target]] = [next[target], next[index]];
    setChosen(next);
  }

  return (
    <div>
      <span className="spec mb-1 block text-ink">{label}</span>
      {chosen.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {chosen.length === 0 ? (
        <p className="rounded-sm border border-dashed border-rule-strong px-3 py-2.5 text-sm text-ink-2">
          Nothing chosen.
        </p>
      ) : (
        <ol className="space-y-1">
          {chosen.map((id, index) => (
            <li
              key={id}
              className="flex items-center gap-2 rounded-sm border border-rule bg-surface px-2.5 py-1.5"
            >
              <span className="font-mono text-xs text-ink-3 tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{byId.get(id) ?? id}</span>
              <button
                type="button"
                aria-label="Move up"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="px-1 text-ink-2 hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => move(index, 1)}
                disabled={index === chosen.length - 1}
                className="px-1 text-ink-2 hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setChosen(chosen.filter((c) => c !== id))}
                className="px-1 text-ink-2 hover:text-bad"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 ? (
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) setChosen([...chosen, event.target.value]);
          }}
          className="mt-2 w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
        >
          <option value="">Add…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : null}

      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------ repeat rows */

export type Pair = { title: string; body: string };

export function ItemsEditor({
  name,
  label,
  hint,
  value,
}: {
  name: string;
  label: string;
  hint?: string;
  value: Pair[];
}) {
  const [rows, setRows] = useState<Pair[]>(value.length ? value : [{ title: "", body: "" }]);

  function update(index: number, patch: Partial<Pair>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div>
      <span className="spec mb-1 block text-ink">{label}</span>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="rounded-sm border border-rule bg-surface p-2.5">
            <div className="flex items-center gap-2">
              <input
                name={`${name}.title`}
                value={row.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Title"
                className="min-w-0 flex-1 rounded-sm border border-rule-strong px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
                className="px-1 text-ink-2 hover:text-bad"
              >
                ×
              </button>
            </div>
            <textarea
              name={`${name}.body`}
              value={row.body}
              onChange={(event) => update(index, { body: event.target.value })}
              rows={2}
              placeholder="A sentence or two"
              className="mt-2 w-full rounded-sm border border-rule-strong px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { title: "", body: "" }])}
        className="mt-2 rounded-sm border border-rule-strong px-2.5 py-1 text-xs transition-colors hover:border-ink hover:bg-paper-deep"
      >
        Add another
      </button>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------ menu editor */

export type MenuLink = { label: string; href: string };

/** The main menu: a list of label/address pairs the operator can reorder. */
export function MenuEditor({ value }: { value: MenuLink[] }) {
  const [rows, setRows] = useState<MenuLink[]>(value.length ? value : [{ label: "", href: "" }]);

  function update(index: number, patch: Partial<MenuLink>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              name="primary.label"
              value={row.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="What it says"
              className="min-w-32 flex-1 rounded-sm border border-rule-strong px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
            />
            <input
              name="primary.href"
              value={row.href}
              onChange={(event) => update(index, { href: event.target.value })}
              placeholder="/shop"
              className="min-w-32 flex-1 rounded-sm border border-rule-strong px-2 py-1.5 font-mono text-xs focus:border-ink focus:outline-none"
            />
            <button type="button" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0} className="px-1 text-ink-2 hover:text-ink disabled:opacity-30">
              ↑
            </button>
            <button type="button" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === rows.length - 1} className="px-1 text-ink-2 hover:text-ink disabled:opacity-30">
              ↓
            </button>
            <button type="button" aria-label="Remove" onClick={() => setRows(rows.filter((_, i) => i !== index))} className="px-1 text-ink-2 hover:text-bad">
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { label: "", href: "" }])}
        className="mt-2 rounded-sm border border-rule-strong px-2.5 py-1 text-xs transition-colors hover:border-ink hover:bg-paper-deep"
      >
        Add a menu item
      </button>
    </div>
  );
}
