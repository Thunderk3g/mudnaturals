import { readSite } from "@/lib/site-settings";
import { getSettingRaw } from "@/server/cms";
import { ActionForm } from "../../action-form";
import { saveSiteSettingsAction } from "../../cms-actions";
import { Explain, Panel } from "../../ui";

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

export default async function SiteTextPage() {
  const site = readSite(await getSettingRaw("site"));

  return (
    <>
      <Explain>
        The wording that appears on every page — in the header, the footer, and the strip across the
        very top. Saving here changes the live site immediately.
      </Explain>

      <ActionForm action={saveSiteSettingsAction} submitLabel="Save" variant="primary" size="md">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <Panel title="The brand">
            <div className="space-y-3 px-3 py-3">
              <div>
                <label htmlFor="f-brand" className="spec mb-1 block text-ink">
                  Shop name
                </label>
                <input id="f-brand" name="brand_name" defaultValue={site.brand_name} className={control} />
              </div>
              <div>
                <label htmlFor="f-tagline" className="spec mb-1 block text-ink">
                  Tagline
                </label>
                <input id="f-tagline" name="tagline" defaultValue={site.tagline} className={control} />
                <p className="mt-1 text-xs text-ink-2">A few words under the name. Keep it short.</p>
              </div>
              <div>
                <label htmlFor="f-blurb" className="spec mb-1 block text-ink">
                  Footer paragraph
                </label>
                <textarea
                  id="f-blurb"
                  name="footer_blurb"
                  rows={3}
                  defaultValue={site.footer_blurb}
                  className={control}
                />
              </div>
            </div>
          </Panel>

          <div className="space-y-5">
            <Panel title="Announcement strip">
              <div className="space-y-3 px-3 py-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="announcement_enabled"
                    defaultChecked={site.announcement.enabled}
                    className="mt-0.5 h-4 w-4 accent-[#b4552d]"
                  />
                  <span>
                    Show a strip across the top of every page.
                    <span className="mt-0.5 block text-xs text-ink-2">
                      For delivery notices, festival closures, a new collection. Turn it off when
                      there is nothing to say — a permanent banner stops being read.
                    </span>
                  </span>
                </label>
                <div>
                  <label htmlFor="f-ann-text" className="spec mb-1 block text-ink">
                    What it says
                  </label>
                  <input
                    id="f-ann-text"
                    name="announcement_text"
                    defaultValue={site.announcement.text}
                    placeholder="Free delivery inside the valley this week"
                    className={control}
                  />
                </div>
                <div>
                  <label htmlFor="f-ann-href" className="spec mb-1 block text-ink">
                    Where it links (optional)
                  </label>
                  <input
                    id="f-ann-href"
                    name="announcement_href"
                    defaultValue={site.announcement.href}
                    placeholder="/shop"
                    className={`${control} font-mono text-xs`}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="How people reach you">
              <div className="space-y-3 px-3 py-3">
                <div>
                  <label htmlFor="f-email" className="spec mb-1 block text-ink">
                    Email
                  </label>
                  <input id="f-email" name="email" type="email" defaultValue={site.email} className={control} />
                </div>
                <div>
                  <label htmlFor="f-phone" className="spec mb-1 block text-ink">
                    Phone
                  </label>
                  <input id="f-phone" name="phone" defaultValue={site.phone} className={control} />
                </div>
                <div>
                  <label htmlFor="f-instagram" className="spec mb-1 block text-ink">
                    Instagram
                  </label>
                  <input
                    id="f-instagram"
                    name="instagram"
                    defaultValue={site.instagram}
                    placeholder="mudnaturals"
                    className={control}
                  />
                </div>
                <p className="text-xs leading-relaxed text-ink-2">
                  Anything left empty is left off the site rather than shown blank.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
