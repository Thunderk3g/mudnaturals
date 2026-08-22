import Link from "next/link";
import { getImpactSummary } from "@/server/queries";
import { copy } from "@/content/copy";
import { homeCopy } from "@/content/home-copy";

/**
 * Four catalogue columns, then the live impact band, then the colophon. The
 * footer renders on every page, so a database hiccup must not take the page
 * with it — the band simply drops out.
 */

const COLUMNS = [
  {
    heading: copy.footer.shopHeading,
    links: [
      { href: "/shop", label: copy.shop.allProducts },
      { href: "/collections", label: copy.nav.collections },
      { href: "/cart", label: copy.cart.title },
    ],
  },
  {
    heading: copy.footer.discoverHeading,
    links: [
      { href: "/makers", label: copy.nav.makers },
      { href: "/journal", label: copy.nav.journal },
      { href: "/craft", label: copy.nav.craft },
    ],
  },
  {
    heading: copy.footer.aboutHeading,
    links: [
      { href: "/about", label: copy.nav.story },
      { href: "/impact", label: copy.nav.impact },
      { href: "/contact", label: copy.nav.contact },
    ],
  },
  {
    heading: copy.footer.helpHeading,
    links: [
      { href: "/shipping", label: copy.footer.shipping },
      { href: "/returns", label: copy.footer.returns },
      { href: "/orders", label: copy.footer.trackOrder },
      { href: "/faq", label: copy.footer.faq },
    ],
  },
];

export async function SiteFooter() {
  const impact = await getImpactSummary().catch(() => ({} as Record<string, unknown>));
  const stat = (key: string) => (typeof impact[key] === "number" ? (impact[key] as number) : null);

  // flatMap rather than filter + type predicate: it narrows `value` to number
  // without a cast, so a missing count simply drops out of the band.
  const stats = [
    { label: String(copy.impact.makersCount), value: stat("maker_count") },
    { label: String(copy.impact.communitiesCount), value: stat("community_count") },
    { label: String(copy.impact.districtsCount), value: stat("district_count") },
  ].flatMap((entry) => (entry.value === null ? [] : [{ label: entry.label, value: entry.value }]));

  return (
    <footer className="mt-20 border-t border-rule bg-paper-deep lg:mt-30">
      <div className="container-page py-16 lg:py-20">
        <div className="grid grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-12 lg:col-span-4">
            <p className="font-serif text-2xl">{copy.brand.name}</p>
            <p className="spec mt-2">{copy.brand.tagline}</p>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-2">{copy.brand.description}</p>
          </div>

          <nav
            aria-label={homeCopy.footer.navLabel}
            className="col-span-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-8"
          >
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="spec">{column.heading}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-ink-2 hover:text-clay">
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
              <Link href="/impact" className="spec mt-2 inline-block text-ink hover:text-clay">
                {copy.impact.title} →
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
              <li>
                <a
                  href={homeCopy.footer.instagramHref}
                  className="text-sm text-ink-2 hover:text-clay"
                  rel="noreferrer"
                  target="_blank"
                >
                  {homeCopy.footer.instagram}
                </a>
              </li>
              <li>
                <a href={`mailto:${homeCopy.footer.email}`} className="text-sm text-ink-2 hover:text-clay">
                  {homeCopy.footer.email}
                </a>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-ink-2 hover:text-clay">
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
          <div className="flex gap-6">
            <Link href="/privacy" className="spec text-ink hover:text-clay">
              {copy.footer.privacy}
            </Link>
            <Link href="/terms" className="spec text-ink hover:text-clay">
              {copy.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
