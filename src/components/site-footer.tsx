import Link from "next/link";
import { getChrome } from "@/server/cms";
import { getImpactSummary } from "@/server/queries";
import type { FooterGroup } from "@/lib/site-settings";
import { copy } from "@/content/copy";
import { homeCopy } from "@/content/home-copy";

/**
 * Catalogue columns, then the live impact band, then the colophon.
 *
 * The columns come from settings when an operator has arranged them and from
 * the constant below when they have not — an empty footer is a mistake nobody
 * makes on purpose, and a footer with no way out of it strands people.
 *
 * The impact band is unchanged and must stay that way: `getImpactSummary()` is
 * an aggregate, cached for an hour, because running it per render meant
 * eighteen concurrent aggregates during a build. The footer is also on every
 * page, so a database hiccup must not take the page with it — the band drops
 * out instead.
 */

const FALLBACK_GROUPS: FooterGroup[] = [
  {
    title: copy.footer.shopHeading,
    links: [
      { href: "/shop", label: copy.shop.allProducts },
      { href: "/collections", label: copy.nav.collections },
      { href: "/cart", label: copy.cart.title },
    ],
  },
  {
    title: copy.footer.discoverHeading,
    links: [
      { href: "/communities", label: copy.nav.communities },
      { href: "/craft", label: copy.nav.craft },
      { href: "/journal", label: copy.nav.journal },
    ],
  },
  {
    title: copy.footer.aboutHeading,
    links: [
      { href: "/about", label: copy.nav.story },
      { href: "/impact", label: copy.nav.impact },
      { href: "/contact", label: copy.nav.contact },
    ],
  },
  {
    // Only routes that exist. Delivery, returns and FAQ pages need policy
    // nobody has written yet (QUESTIONS.md #12) — linking at them meanwhile put
    // four 404s in the footer of every page on the site, and Next prefetched
    // all four on hover.
    title: copy.footer.helpHeading,
    links: [
      { href: "/order/lookup", label: copy.footer.trackOrder },
      { href: "/contact", label: copy.nav.contact },
    ],
  },
];

/** Instagram is stored as a handle or a URL; both have to end up as a link. */
function instagramHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://instagram.com/${value.replace(/^@/, "")}`;
}

export async function SiteFooter() {
  const [{ site, nav }, impact] = await Promise.all([
    getChrome(),
    getImpactSummary().catch(() => ({}) as Record<string, unknown>),
  ]);

  const stat = (key: string) => (typeof impact[key] === "number" ? (impact[key] as number) : null);

  // flatMap rather than filter + type predicate: it narrows `value` to number
  // without a cast, so a missing count simply drops out of the band.
  const stats = [
    { label: String(copy.impact.communitiesCount), value: stat("community_count") },
    { label: String(copy.impact.districtsCount), value: stat("district_count") },
    { label: String(copy.impact.makersCount), value: stat("maker_count") },
  ].flatMap((entry) => (entry.value === null ? [] : [{ label: entry.label, value: entry.value }]));

  const groups = nav.footer_groups.length ? nav.footer_groups : FALLBACK_GROUPS;

  const contacts = [
    site.instagram
      ? { key: "instagram", href: instagramHref(site.instagram), label: homeCopy.footer.instagram, external: true }
      : null,
    site.email ? { key: "email", href: `mailto:${site.email}`, label: site.email, external: false } : null,
    site.phone
      ? { key: "phone", href: `tel:${site.phone.replace(/\s+/g, "")}`, label: site.phone, external: false }
      : null,
  ].flatMap((entry) => (entry ? [entry] : []));

  return (
    <footer className="mt-20 border-t border-rule bg-paper-deep lg:mt-30">
      <div className="container-page py-16 lg:py-20">
        <div className="grid grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <p className="font-serif text-2xl">{site.brand_name}</p>
            {site.tagline ? <p className="spec mt-2">{site.tagline}</p> : null}
            {site.footer_blurb ? (
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-2">{site.footer_blurb}</p>
            ) : null}
          </div>

          <nav
            aria-label={homeCopy.footer.navLabel}
            className="col-span-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-8"
          >
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="spec">{group.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="link-wipe inline-block text-sm text-ink-2 transition-colors duration-300 hover:text-clay"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="border-t border-rule">
          <div className="container-page flex flex-wrap items-end justify-between gap-x-12 gap-y-8 py-10">
            <dl className="flex flex-wrap gap-x-14 gap-y-6">
              {stats.map((entry) => (
                <div key={entry.label}>
                  <dt className="spec">{entry.label}</dt>
                  <dd className="mt-1 font-mono text-2xl tabular-nums text-ink">{entry.value}</dd>
                </div>
              ))}
            </dl>
            <div className="max-w-xs">
              <p className="text-sm text-ink-2">{homeCopy.footer.impactBandNote}</p>
              <Link
                href="/impact"
                className="spec link-wipe mt-2 inline-block text-ink transition-colors duration-300 hover:text-clay"
              >
                {copy.impact.title} <span aria-hidden className="arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-rule">
        <div className="container-page grid grid-cols-12 gap-x-8 gap-y-10 py-12">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="font-serif text-xl">{copy.footer.newsletter}</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-2">{copy.footer.newsletterHelp}</p>
            <div className="mt-5 flex max-w-sm items-stretch border-b border-rule-strong">
              <label htmlFor="footer-email" className="sr-only">
                {copy.checkout.email}
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder={copy.footer.emailPlaceholder}
                aria-describedby="footer-email-note"
                className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none"
              />
              <span className="spec self-center pl-4">{copy.footer.subscribe}</span>
            </div>
            <p id="footer-email-note" className="spec mt-2">
              {homeCopy.footer.newsletterNote}
            </p>
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-4 lg:col-start-8">
            <h2 className="spec">{homeCopy.footer.elsewhereHeading}</h2>
            <ul className="mt-4 space-y-2.5">
              {/* Only what has actually been published. An empty contact row is
                  a promise the site cannot keep. */}
              {contacts.map((contact) => (
                <li key={contact.key}>
                  <a
                    href={contact.href}
                    className="link-wipe inline-block text-sm text-ink-2 transition-colors duration-300 hover:text-clay"
                    {...(contact.external ? { rel: "noreferrer", target: "_blank" } : {})}
                  >
                    {contact.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="link-wipe inline-block text-sm text-ink-2 transition-colors duration-300 hover:text-clay"
                >
                  {copy.nav.contact}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-6">
          <p className="spec">{copy.footer.rights(new Date().getFullYear())}</p>
          <p className="spec max-w-md">{homeCopy.footer.photographyNote}</p>

        </div>
      </div>
    </footer>
  );
}
