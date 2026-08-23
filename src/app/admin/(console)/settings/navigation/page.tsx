import { readNav } from "@/lib/site-settings";
import { getSettingRaw } from "@/server/cms";
import { ActionForm } from "../../../action-form";
import { saveNavAction } from "../../../cms-actions";
import { MenuEditor } from "../../../pickers";
import { Explain, Panel } from "../../../ui";

export const dynamic = "force-dynamic";

/**
 * The header menu, and the link columns in the footer.
 *
 * Addresses are typed rather than picked from a list on purpose: the menu often
 * needs to point at a specific category, collection or story, and a picker
 * covering all of those would be four pickers. The common ones are listed
 * beside the field instead.
 */
export default async function NavigationPage() {
  const nav = readNav(await getSettingRaw("nav"));

  return (
    <>
      <Explain>
        The menu across the top of every page. Drag order is set with the arrows — the top item here
        is the leftmost item on the site. Addresses start with a slash, like{" "}
        <code className="font-mono">/shop</code>.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        <Panel title="Main menu">
          <div className="px-3 py-3">
            <ActionForm action={saveNavAction} submitLabel="Save menu" variant="primary" size="md">
              <MenuEditor value={nav.primary} />
            </ActionForm>
          </div>
        </Panel>

        <Panel title="Addresses you can use">
          <ul className="space-y-1.5 px-3 py-3 text-sm">
            {[
              ["/", "Homepage"],
              ["/shop", "Everything in the shop"],
              ["/shop/<category>", "One category"],
              ["/collections", "All collections"],
              ["/collections/<name>", "One collection"],
              ["/communities", "The communities"],
              ["/craft", "Materials and techniques"],
              ["/journal", "Journal"],
              ["/about", "About"],
              ["/contact", "Contact"],
              ["/order/lookup", "Track an order"],
            ].map(([href, what]) => (
              <li key={href} className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="font-mono text-xs text-ink">{href}</code>
                <span className="text-xs text-ink-2">{what}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-rule px-3 py-3 text-xs leading-relaxed text-ink-2">
            An address that does not exist gives visitors a “page not found”. Open the site in
            another tab and check the address bar if you are unsure.
          </p>
        </Panel>
      </div>
    </>
  );
}
