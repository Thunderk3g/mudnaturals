/**
 * The chrome around every page: brand strings, the announcement bar, the
 * navigation, and the SEO defaults.
 *
 * These live in the `settings` table as jsonb, but nothing in the app reads
 * that jsonb directly. Everything goes through the readers below, which fill in
 * a default for anything missing — so a half-saved settings row degrades to the
 * shipped copy instead of blanking the header on the live site.
 */

export type NavLink = { label: string; href: string };
export type FooterGroup = { title: string; links: NavLink[] };

export type SiteSettings = {
  brand_name: string;
  tagline: string;
  announcement: { enabled: boolean; text: string; href: string };
  footer_blurb: string;
  instagram: string;
  email: string;
  phone: string;
};

export type NavSettings = {
  primary: NavLink[];
  footer_groups: FooterGroup[];
};

export type SeoSettings = {
  default_title: string;
  default_description: string;
  og_media_id: string | null;
};

export const SITE_DEFAULTS: SiteSettings = {
  brand_name: "MUD Naturals",
  tagline: "Objects with origins",
  announcement: { enabled: false, text: "", href: "" },
  footer_blurb: "A curated store for work made in Nepali communities.",
  instagram: "",
  email: "",
  phone: "",
};

export const NAV_DEFAULTS: NavSettings = {
  primary: [
    { label: "Shop", href: "/shop" },
    { label: "Communities", href: "/communities" },
    { label: "Craft", href: "/craft" },
    { label: "Journal", href: "/journal" },
    { label: "About", href: "/about" },
  ],
  footer_groups: [],
};

export const SEO_DEFAULTS: SeoSettings = {
  default_title: "MUD Naturals",
  default_description:
    "Curated goods from Nepali communities, with the origin of every object on the label.",
  og_media_id: null,
};

/* ----------------------------------------------------------------- readers -- */

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v : fallback;

const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

function link(v: unknown): NavLink | null {
  if (!v || typeof v !== "object") return null;
  const { label, href } = v as Record<string, unknown>;
  if (typeof label !== "string" || typeof href !== "string") return null;
  if (!label.trim() || !href.trim()) return null;
  return { label: label.trim(), href: href.trim() };
}

export function readSite(raw: Record<string, unknown> | null): SiteSettings {
  if (!raw) return SITE_DEFAULTS;
  const ann = (raw.announcement ?? {}) as Record<string, unknown>;
  return {
    brand_name: str(raw.brand_name, SITE_DEFAULTS.brand_name),
    tagline: str(raw.tagline, SITE_DEFAULTS.tagline),
    announcement: {
      enabled: bool(ann.enabled, false),
      text: typeof ann.text === "string" ? ann.text : "",
      href: typeof ann.href === "string" ? ann.href : "",
    },
    footer_blurb: str(raw.footer_blurb, SITE_DEFAULTS.footer_blurb),
    instagram: typeof raw.instagram === "string" ? raw.instagram : "",
    email: typeof raw.email === "string" ? raw.email : "",
    phone: typeof raw.phone === "string" ? raw.phone : "",
  };
}

export function readNav(raw: Record<string, unknown> | null): NavSettings {
  if (!raw) return NAV_DEFAULTS;

  const primary = Array.isArray(raw.primary)
    ? raw.primary.flatMap((entry) => {
        const parsed = link(entry);
        return parsed ? [parsed] : [];
      })
    : [];

  const footer_groups = Array.isArray(raw.footer_groups)
    ? raw.footer_groups.flatMap((entry): FooterGroup[] => {
        if (!entry || typeof entry !== "object") return [];
        const { title, links } = entry as Record<string, unknown>;
        if (typeof title !== "string" || !title.trim()) return [];
        const parsed = Array.isArray(links)
          ? links.flatMap((l) => {
              const one = link(l);
              return one ? [one] : [];
            })
          : [];
        return [{ title: title.trim(), links: parsed }];
      })
    : [];

  // An empty nav is almost certainly a mistake rather than a choice, and a
  // header with no links strands every visitor. Fall back rather than obey.
  return {
    primary: primary.length ? primary : NAV_DEFAULTS.primary,
    footer_groups,
  };
}

export function readSeo(raw: Record<string, unknown> | null): SeoSettings {
  if (!raw) return SEO_DEFAULTS;
  return {
    default_title: str(raw.default_title, SEO_DEFAULTS.default_title),
    default_description: str(raw.default_description, SEO_DEFAULTS.default_description),
    og_media_id: typeof raw.og_media_id === "string" && raw.og_media_id ? raw.og_media_id : null,
  };
}

/* ----------------------------------------------------------------- writers -- */

const field = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export function siteFromForm(fd: FormData): SiteSettings {
  return {
    brand_name: field(fd, "brand_name") || SITE_DEFAULTS.brand_name,
    tagline: field(fd, "tagline"),
    announcement: {
      enabled: fd.get("announcement_enabled") != null,
      text: field(fd, "announcement_text"),
      href: field(fd, "announcement_href"),
    },
    footer_blurb: field(fd, "footer_blurb"),
    instagram: field(fd, "instagram"),
    email: field(fd, "email"),
    phone: field(fd, "phone"),
  };
}

export function navFromForm(fd: FormData): NavSettings {
  const labels = fd.getAll("primary.label");
  const hrefs = fd.getAll("primary.href");
  const primary: NavLink[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const parsed = link({ label: labels[i], href: hrefs[i] });
    if (parsed) primary.push(parsed);
  }

  // Footer groups are flat in the form: every link carries the index of the
  // group it belongs to, so the whole thing round-trips through one FormData
  // without nested field names.
  const groupTitles = fd.getAll("group.title");
  const groups: FooterGroup[] = groupTitles.map((title) => ({
    title: typeof title === "string" ? title.trim() : "",
    links: [],
  }));

  const linkGroups = fd.getAll("grouplink.group");
  const linkLabels = fd.getAll("grouplink.label");
  const linkHrefs = fd.getAll("grouplink.href");
  for (let i = 0; i < linkGroups.length; i += 1) {
    const gi = Number(linkGroups[i]);
    const parsed = link({ label: linkLabels[i], href: linkHrefs[i] });
    if (parsed && Number.isInteger(gi) && groups[gi]) groups[gi].links.push(parsed);
  }

  return {
    primary,
    footer_groups: groups.filter((g) => g.title && g.links.length > 0),
  };
}

export function seoFromForm(fd: FormData): SeoSettings {
  return {
    default_title: field(fd, "default_title") || SEO_DEFAULTS.default_title,
    default_description: field(fd, "default_description") || SEO_DEFAULTS.default_description,
    og_media_id: field(fd, "og_media_id") || null,
  };
}
