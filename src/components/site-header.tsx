import Link from "next/link";
import { getChrome } from "@/server/cms";
import { SiteNav } from "@/components/site-nav";
import { blockCopy } from "@/content/home-copy";

/**
 * The masthead, read from settings.
 *
 * This half is a server component so the navigation, the brand name and the
 * announcement come out of the database rather than out of a constant. The
 * interactive half lives in `site-nav.tsx`; the split keeps the settings read
 * off the client bundle.
 *
 * `getChrome()` is cached under the `cms` tag — the header renders on every
 * page, and a build renders eighteen at once.
 */
export async function SiteHeader() {
  const { site, nav } = await getChrome();
  const announcement = site.announcement;
  const showAnnouncement = announcement.enabled && Boolean(announcement.text.trim());

  return (
    <>
      {/* Above the sticky bar rather than inside it: a notice is worth a strip
          of the first screen, not a permanent strip of every screen. */}
      {showAnnouncement ? (
        <aside aria-label={blockCopy.announcementLabel} className="border-b border-rule bg-ink">
          <div className="container-page py-2.5">
            {announcement.href.trim() ? (
              <Link
                href={announcement.href}
                className="spec link-wipe inline-block text-paper transition-colors duration-300 hover:text-clay-soft"
              >
                {announcement.text} <span aria-hidden className="arrow">→</span>
              </Link>
            ) : (
              <p className="spec text-paper">{announcement.text}</p>
            )}
          </div>
        </aside>
      ) : null}

      <SiteNav brandName={site.brand_name} tagline={site.tagline} primary={nav.primary} />
    </>
  );
}
