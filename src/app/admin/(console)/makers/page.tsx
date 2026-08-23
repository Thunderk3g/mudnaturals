import Link from "next/link";
import { CONSENT_SCOPES, getFormOptions, listMakers } from "@/server/admin";
import { saveMakerAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { Empty, Explain, Field, Note, PageHeader, Panel, Pill, PublishPill, Select, Table, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

export default async function MakersPage() {
  const [makers, options] = await Promise.all([listMakers(), getFormOptions()]);

  return (
    <>
      <PageHeader title="Makers" meta={`${makers.length} on file`} />

      <Explain>
        The site now leads with communities rather than individual makers. A maker still appears on the
        products they made, so these records still matter — they are just no longer the way people browse.
      </Explain>

      <Note tone="warn">
        Never publish a person&apos;s real name or photograph without a signed consent record. Check the
        consent column before setting anyone live.
      </Note>

      <Panel className="mt-4">
        {makers.length === 0 ? (
          <Empty>No makers yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Maker</th>
                <th className={th}>Status</th>
                <th className={th}>Community</th>
                <th className={th}>Craft</th>
                <th className={th}>Consent (active)</th>
                <th className={`${th} text-right`}>Products</th>
              </tr>
            </thead>
            <tbody>
              {makers.map((maker) => (
                <tr key={maker.id} className="hover:bg-paper-deep">
                  <td className={td}>
                    <Link
                      href={`/admin/makers/${maker.id}`}
                      className="underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {maker.display_name}
                    </Link>
                    <div className="spec">{maker.slug}</div>
                  </td>
                  <td className={td}>
                    <PublishPill status={maker.status} />
                  </td>
                  <td className={td}>
                    {maker.community_name}
                    <div className="spec">{maker.district}</div>
                  </td>
                  <td className={td}>{maker.craft ?? <span className="text-ink-3">—</span>}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      {CONSENT_SCOPES.map((scope) => (
                        <Pill key={scope} tone={maker.active_scopes.includes(scope) ? "ok" : "bad"}>
                          {scope} {maker.active_scopes.includes(scope) ? "✓" : "✗"}
                        </Pill>
                      ))}
                    </div>
                    {maker.status === "published" && !maker.active_scopes.includes("name") ? (
                      <div className="mt-1 text-xs font-medium text-bad">
                        Published without name consent — fall back to community attribution.
                      </div>
                    ) : null}
                  </td>
                  <td className={numCell}>{maker.product_count}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Add a maker" className="mt-4">
        <div className="px-3 py-3">
          <ActionForm action={saveMakerAction} submitLabel="Create maker" variant="primary" size="md">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Display name" name="display_name" required />
              <Field label="Slug" name="slug" required hint="lowercase-with-hyphens" />
              <Select label="Community" name="community_id" required defaultValue="">
                <option value="">Choose…</option>
                {options.communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </Select>
              <Select label="Status" name="status" defaultValue="draft">
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </Select>
              <Field label="Craft" name="craft" />
              <Field label="Working since" name="working_since" type="number" min="1900" max="2100" />
            </div>
          </ActionForm>
        </div>
      </Panel>
    </>
  );
}
