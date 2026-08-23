import { readSeo } from "@/lib/site-settings";
import { getSettingRaw } from "@/server/cms";
import { listMedia } from "@/server/admin-cms";
import { ActionForm } from "../../../action-form";
import { saveSeoAction } from "../../../cms-actions";
import { MediaPicker } from "../../../pickers";
import { Explain, Panel } from "../../../ui";

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

export default async function SeoPage() {
  const [seo, media] = await Promise.all([getSettingRaw("seo").then(readSeo), listMedia()]);

  return (
    <>
      <Explain>
        What people see when the site appears in a search result, or when someone pastes a link into
        a chat. Product and story pages write their own; this is the fallback for everything else.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ActionForm action={saveSeoAction} submitLabel="Save" variant="primary" size="md">
          <Panel title="Default wording">
            <div className="space-y-3 px-3 py-3">
              <div>
                <label htmlFor="f-title" className="spec mb-1 block text-ink">
                  Title
                </label>
                <input
                  id="f-title"
                  name="default_title"
                  defaultValue={seo.default_title}
                  className={control}
                />
                <p className="mt-1 text-xs text-ink-2">Aim for under about 60 characters.</p>
              </div>
              <div>
                <label htmlFor="f-desc" className="spec mb-1 block text-ink">
                  Description
                </label>
                <textarea
                  id="f-desc"
                  name="default_description"
                  rows={3}
                  defaultValue={seo.default_description}
                  className={control}
                />
                <p className="mt-1 text-xs text-ink-2">
                  One or two plain sentences, under about 160 characters. Say what the shop sells and
                  where it comes from.
                </p>
              </div>

              <div className="border-t border-rule pt-3">
                <MediaPicker
                  name="og_media_id"
                  label="Sharing image"
                  hint="Shown when someone pastes a link to the site into a chat or a post. A wide photo works best."
                  value={seo.og_media_id}
                  library={media.map((m) => ({ id: m.id, filename: m.filename, alt: m.alt }))}
                />
              </div>
            </div>
          </Panel>
        </ActionForm>

        <Panel title="Roughly how it will look">
          <div className="px-3 py-4">
            <p className="text-[15px] leading-snug text-[#1a0dab]">{seo.default_title}</p>
            <p className="mt-0.5 font-mono text-xs text-[#006621]">
              {process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "mudnaturals"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{seo.default_description}</p>
          </div>
          <p className="border-t border-rule px-3 py-3 text-xs leading-relaxed text-ink-2">
            Search engines rewrite these when they think something else fits the search better. This
            is a starting point, not a guarantee.
          </p>
        </Panel>
      </div>
    </>
  );
}
