/**
 * Page blocks — the shape of everything the console can put on a page.
 *
 * One declaration per block type, used three ways:
 *   1. the console renders its editor from `fields`
 *   2. `parseBlockData` turns that form back into the payload
 *   3. the storefront renders the payload through the matching component
 *
 * Adding a section to the site is a new entry here, a `case` in the renderer,
 * and one value added to the CHECK constraint in migration 011. Nothing else.
 *
 * No "use client" and no "server-only": the console imports it in a client
 * component, the storefront and the server actions import it on the server.
 */

/* ------------------------------------------------------------- primitives -- */

export type Cta = { label: string; href: string };
export type PropItem = { title: string; body: string };

export type RefSource = "category" | "collection" | "community" | "product";

export type FieldSpec =
  | { kind: "text"; name: string; label: string; hint?: string; placeholder?: string }
  | { kind: "textarea"; name: string; label: string; hint?: string; rows?: number }
  | { kind: "number"; name: string; label: string; hint?: string; min?: number; max?: number }
  | { kind: "media"; name: string; label: string; hint?: string }
  | { kind: "link"; name: string; label: string; hint?: string }
  | { kind: "select"; name: string; label: string; hint?: string; options: { value: string; label: string }[] }
  | { kind: "ref"; name: string; label: string; source: RefSource; hint?: string }
  | { kind: "refs"; name: string; label: string; source: RefSource; hint?: string }
  | { kind: "items"; name: string; label: string; hint?: string };

/* ----------------------------------------------------------- block payloads */

export type HeroData = {
  eyebrow: string;
  title: string;
  body: string;
  primary_cta: Cta;
  secondary_cta: Cta;
  media_id: string | null;
  caption: string;
};

export type StatementData = { eyebrow: string; title: string; body: string };

export type ValuePropsData = { eyebrow: string; title: string; items: PropItem[] };

export type CategoryGridData = {
  eyebrow: string;
  title: string;
  cta_label: string;
  cta_href: string;
  category_ids: string[];
};

export type ProductRailData = {
  eyebrow: string;
  title: string;
  cta_label: string;
  cta_href: string;
  source: "newest" | "collection" | "category" | "manual";
  collection_id: string | null;
  category_id: string | null;
  product_ids: string[];
  limit: number;
};

export type CollectionFeatureData = { eyebrow: string; collection_id: string | null };
export type CommunityFeatureData = { eyebrow: string; community_id: string | null };
export type JournalRailData = { eyebrow: string; title: string; limit: number };

export type ImageBannerData = {
  media_id: string | null;
  eyebrow: string;
  title: string;
  body: string;
  cta: Cta;
  align: "left" | "right" | "center";
};

export type RichTextData = { eyebrow: string; title: string; body: string };

export type BlockData =
  | HeroData
  | StatementData
  | ValuePropsData
  | CategoryGridData
  | ProductRailData
  | CollectionFeatureData
  | CommunityFeatureData
  | JournalRailData
  | ImageBannerData
  | RichTextData;

export type BlockType =
  | "hero"
  | "statement"
  | "value_props"
  | "category_grid"
  | "product_rail"
  | "collection_feature"
  | "community_feature"
  | "journal_rail"
  | "image_banner"
  | "rich_text";

export type Block = {
  id: string;
  page_key: PageKey;
  block_type: BlockType;
  position: number;
  is_visible: boolean;
  data: Record<string, unknown>;
};

export type PageKey = "home" | "about" | "shop";

export const PAGE_KEYS: { key: PageKey; label: string; path: string; note: string }[] = [
  { key: "home", label: "Homepage", path: "/", note: "The first thing anyone sees." },
  { key: "about", label: "About page", path: "/about", note: "Who we are and how we buy." },
  { key: "shop", label: "Shop intro", path: "/shop", note: "Sits above the product grid." },
];

/* ------------------------------------------------------------ definitions -- */

type BlockSpec = {
  label: string;
  /** One line, written for someone who has never seen a CMS. */
  description: string;
  fields: FieldSpec[];
  defaults: Record<string, unknown>;
};

export const BLOCK_SPECS: Record<BlockType, BlockSpec> = {
  hero: {
    label: "Hero",
    description: "Big headline, a photo and up to two buttons. Usually the first block on a page.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label above the headline", placeholder: "Curated in Nepal" },
      { kind: "text", name: "title", label: "Headline" },
      { kind: "textarea", name: "body", label: "Paragraph under the headline", rows: 3 },
      { kind: "link", name: "primary_cta", label: "Main button" },
      { kind: "link", name: "secondary_cta", label: "Second button", hint: "Leave the label empty to hide it." },
      { kind: "media", name: "media_id", label: "Photo" },
      { kind: "text", name: "caption", label: "Caption under the photo" },
    ],
    defaults: {
      eyebrow: "",
      title: "",
      body: "",
      primary_cta: { label: "", href: "" },
      secondary_cta: { label: "", href: "" },
      media_id: null,
      caption: "",
    },
  },

  statement: {
    label: "Statement",
    description: "A quiet full-width band with one short piece of writing. Good between two busy sections.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Statement" },
      { kind: "textarea", name: "body", label: "Supporting text", rows: 3 },
    ],
    defaults: { eyebrow: "", title: "", body: "" },
  },

  value_props: {
    label: "Three promises",
    description: "A row of short titled paragraphs — how you ship, how you buy, how you pack.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Heading" },
      { kind: "items", name: "items", label: "Promises" },
    ],
    defaults: { eyebrow: "", title: "", items: [] },
  },

  category_grid: {
    label: "Category list",
    description: "Links through to the parts of the shop. Leave the picker empty to show every category.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Heading" },
      { kind: "refs", name: "category_ids", label: "Categories to show", source: "category", hint: "Empty means all of them, in their own order." },
      { kind: "text", name: "cta_label", label: "Link text on the right" },
      { kind: "text", name: "cta_href", label: "Where that link goes", placeholder: "/shop" },
    ],
    defaults: { eyebrow: "", title: "", cta_label: "", cta_href: "/shop", category_ids: [] },
  },

  product_rail: {
    label: "Product row",
    description: "A row of products. Pick them by hand, or let it follow a collection, a category, or whatever is newest.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Heading" },
      {
        kind: "select",
        name: "source",
        label: "Which products",
        options: [
          { value: "newest", label: "Newest in the shop" },
          { value: "collection", label: "From a collection" },
          { value: "category", label: "From a category" },
          { value: "manual", label: "Ones I pick" },
        ],
      },
      { kind: "ref", name: "collection_id", label: "Collection", source: "collection", hint: "Used only when the row follows a collection." },
      { kind: "ref", name: "category_id", label: "Category", source: "category", hint: "Used only when the row follows a category." },
      { kind: "refs", name: "product_ids", label: "Products", source: "product", hint: "Used only when you pick them by hand." },
      { kind: "number", name: "limit", label: "How many to show", min: 2, max: 12 },
      { kind: "text", name: "cta_label", label: "Link text on the right" },
      { kind: "text", name: "cta_href", label: "Where that link goes", placeholder: "/shop" },
    ],
    defaults: {
      eyebrow: "",
      title: "",
      cta_label: "",
      cta_href: "/shop",
      source: "newest",
      collection_id: null,
      category_id: null,
      product_ids: [],
      limit: 6,
    },
  },

  collection_feature: {
    label: "Featured collection",
    description: "One collection, given a large photo and its own story. Leave it empty to always feature the first published collection.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "ref", name: "collection_id", label: "Collection", source: "collection" },
    ],
    defaults: { eyebrow: "", collection_id: null },
  },

  community_feature: {
    label: "Featured community",
    description: "One community, its photo and what it makes. Leave it empty to feature whichever community has the most products live.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "ref", name: "community_id", label: "Community", source: "community" },
    ],
    defaults: { eyebrow: "", community_id: null },
  },

  journal_rail: {
    label: "Journal row",
    description: "The most recent journal stories.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Heading" },
      { kind: "number", name: "limit", label: "How many stories", min: 1, max: 6 },
    ],
    defaults: { eyebrow: "", title: "", limit: 3 },
  },

  image_banner: {
    label: "Photo banner",
    description: "A wide photo with writing over it and one button.",
    fields: [
      { kind: "media", name: "media_id", label: "Photo" },
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Headline" },
      { kind: "textarea", name: "body", label: "Paragraph", rows: 2 },
      { kind: "link", name: "cta", label: "Button" },
      {
        kind: "select",
        name: "align",
        label: "Where the writing sits",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Middle" },
          { value: "right", label: "Right" },
        ],
      },
    ],
    defaults: {
      media_id: null,
      eyebrow: "",
      title: "",
      body: "",
      cta: { label: "", href: "" },
      align: "left",
    },
  },

  rich_text: {
    label: "Text",
    description: "A heading and a few paragraphs. Press Enter twice to start a new paragraph.",
    fields: [
      { kind: "text", name: "eyebrow", label: "Small label" },
      { kind: "text", name: "title", label: "Heading" },
      { kind: "textarea", name: "body", label: "Text", rows: 10 },
    ],
    defaults: { eyebrow: "", title: "", body: "" },
  },
};

export const BLOCK_TYPES = Object.keys(BLOCK_SPECS) as BlockType[];

export function isBlockType(value: string): value is BlockType {
  return value in BLOCK_SPECS;
}

/* ---------------------------------------------------------------- parsing -- */

const str = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

const nullableId = (fd: FormData, key: string): string | null => str(fd, key) || null;

/**
 * Rebuilds a block payload from the console's form.
 *
 * Every value is coerced here rather than trusted: the editor is behind the
 * staff session, but a payload that reaches the storefront with a number where
 * a string belongs blanks a section on the live site, and that is a worse
 * failure than a rejected save.
 */
export function parseBlockData(type: BlockType, fd: FormData): Record<string, unknown> {
  const spec = BLOCK_SPECS[type];
  const out: Record<string, unknown> = { ...spec.defaults };

  for (const field of spec.fields) {
    switch (field.kind) {
      case "text":
      case "textarea":
        out[field.name] = str(fd, field.name);
        break;

      case "number": {
        const text = str(fd, field.name);
        const fallback = Number(spec.defaults[field.name] ?? 0);
        const raw = Number(text);

        // An emptied box means "leave it alone", not "zero" — and `Number("")`
        // is 0, which would then clamp to the minimum and quietly shrink the
        // section to one item. Blank and nonsense both fall back to the shipped
        // default; only a real number is clamped.
        let n = text === "" || !Number.isFinite(raw) ? fallback : Math.round(raw);
        if (field.min != null) n = Math.max(field.min, n);
        if (field.max != null) n = Math.min(field.max, n);
        out[field.name] = n;
        break;
      }

      case "media":
      case "ref":
        out[field.name] = nullableId(fd, field.name);
        break;

      case "refs":
        // Order matters for hand-picked rows, and the console submits one
        // hidden input per row in the order they appear.
        out[field.name] = fd
          .getAll(field.name)
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean);
        break;

      case "link":
        out[field.name] = {
          label: str(fd, `${field.name}.label`),
          href: str(fd, `${field.name}.href`),
        } satisfies Cta;
        break;

      case "select": {
        const value = str(fd, field.name);
        out[field.name] = field.options.some((o) => o.value === value)
          ? value
          : field.options[0].value;
        break;
      }

      case "items": {
        const titles = fd.getAll(`${field.name}.title`);
        const bodies = fd.getAll(`${field.name}.body`);
        const items: PropItem[] = [];
        for (let i = 0; i < titles.length; i += 1) {
          const title = typeof titles[i] === "string" ? (titles[i] as string).trim() : "";
          const body = typeof bodies[i] === "string" ? (bodies[i] as string).trim() : "";
          if (title || body) items.push({ title, body });
        }
        out[field.name] = items;
        break;
      }
    }
  }

  return out;
}

/* --------------------------------------------------------------- accessors -- */
/* The storefront reads payloads through these so a half-filled block renders as
   a missing value rather than throwing on the live site. */

export function s(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === "string" ? v : "";
}

export function n(data: Record<string, unknown>, key: string, fallback: number): number {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function id(data: Record<string, unknown>, key: string): string | null {
  const v = data[key];
  return typeof v === "string" && v ? v : null;
}

export function ids(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

export function cta(data: Record<string, unknown>, key: string): Cta | null {
  const v = data[key];
  if (!v || typeof v !== "object") return null;
  const { label, href } = v as Record<string, unknown>;
  if (typeof label !== "string" || typeof href !== "string") return null;
  if (!label.trim() || !href.trim()) return null;
  return { label: label.trim(), href: href.trim() };
}

export function items(data: Record<string, unknown>, key: string): PropItem[] {
  const v = data[key];
  if (!Array.isArray(v)) return [];
  return v.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { title, body } = entry as Record<string, unknown>;
    return [{ title: typeof title === "string" ? title : "", body: typeof body === "string" ? body : "" }];
  });
}

/** One short line describing a block in the page list, built from its payload. */
export function blockSummary(type: BlockType, data: Record<string, unknown>): string {
  switch (type) {
    case "hero":
    case "statement":
    case "image_banner":
    case "rich_text":
    case "value_props":
    case "category_grid":
    case "journal_rail":
      return s(data, "title") || s(data, "eyebrow") || BLOCK_SPECS[type].label;
    case "product_rail": {
      const source = s(data, "source") || "newest";
      const label = { newest: "newest products", collection: "a collection", category: "a category", manual: "hand-picked products" }[source] ?? source;
      return `${s(data, "title") || "Product row"} · ${label}`;
    }
    case "collection_feature":
      return id(data, "collection_id") ? "A chosen collection" : "The first published collection";
    case "community_feature":
      return id(data, "community_id") ? "A chosen community" : "The community with the most products";
  }
}
