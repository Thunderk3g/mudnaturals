import Link from "next/link";
import { notFound } from "next/navigation";
import { CONSENT_SCOPES, getFormOptions, getMaker } from "@/server/admin";
import { grantConsentAction, revokeConsentAction, saveMakerAction } from "../../../actions";
import { ActionForm } from "../../../action-form";
import {
  Empty,
  Field,
  Note,
  PageHeader,
  Panel,
  Pill,
  PublishPill,
  Select,
  Table,
  TextArea,
  td,
  th,
} from "../../../ui";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);

export default async function MakerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [record, options] = await Promise.all([getMaker(id), getFormOptions()]);
  if (!record) notFound();

  const { maker, consent } = record;
  const activeScopes = consent
    .filter((row) => !row.revoked_at || row.revoked_at > today())
    .map((row) => row.scope);
  const grantable = CONSENT_SCOPES.filter((scope) => !activeScopes.includes(scope));

  return (
    <>
      <PageHeader
        title={maker.display_name}
        meta={
          <div className="flex items-center gap-2">
            <PublishPill status={maker.status} />
            <span className="spec">{maker.slug}</span>
          </div>
        }
        actions={
          <Link href="/admin/makers" className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay">
            ← All makers
          </Link>
        }
      />

      {maker.status === "published" && !activeScopes.includes("name") ? (
        <Note tone="bad">
          This maker is published but has no active <strong>name</strong> consent. The storefront must fall back
          to community-level attribution until a consent record is on file.
        </Note>
      ) : null}
      {maker.portrait_image && !activeScopes.includes("portrait") ? (
        <Note tone="bad">
          A portrait image is set but portrait consent is not active. Do not publish the portrait.
        </Note>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Details">
          <div className="px-3 py-3">
            <ActionForm action={saveMakerAction} submitLabel="Save maker" variant="primary" size="md">
              <input type="hidden" name="maker_id" value={maker.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Display name" name="display_name" required defaultValue={maker.display_name} />
                <Field label="Slug" name="slug" required defaultValue={maker.slug} />
                <Select label="Community" name="community_id" required defaultValue={maker.community_id}>
                  {options.communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </Select>
                <Select label="Status" name="status" defaultValue={maker.status}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </Select>
                <Field label="Craft" name="craft" defaultValue={maker.craft ?? ""} />
                <Field
                  label="Working since"
                  name="working_since"
                  type="number"
                  min="1900"
                  max="2100"
                  defaultValue={maker.working_since ?? ""}
                />
                <Field
                  label="Portrait image path"
                  name="portrait_image"
                  defaultValue={maker.portrait_image ?? ""}
                  className="sm:col-span-2"
                  hint="Storage path. Needs active portrait consent before it goes live."
                />
                <TextArea label="Bio" name="bio" rows={4} defaultValue={maker.bio ?? ""} className="sm:col-span-2" />
                <TextArea
                  label="Quote"
                  name="quote"
                  rows={2}
                  defaultValue={maker.quote ?? ""}
                  className="sm:col-span-2"
                  hint="Needs active quote consent before it goes live."
                />
              </div>
            </ActionForm>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Record consent">
            <div className="px-3 py-3">
              {grantable.length === 0 ? (
                <p className="text-sm text-ink-2">All four scopes already have an active record.</p>
              ) : (
                <ActionForm action={grantConsentAction} submitLabel="Record consent" variant="primary">
                  <input type="hidden" name="maker_id" value={maker.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select label="Scope" name="scope" required defaultValue={grantable[0]}>
                      {grantable.map((scope) => (
                        <option key={scope} value={scope}>
                          {scope}
                        </option>
                      ))}
                    </Select>
                    <Field label="Granted on" name="granted_at" type="date" required defaultValue={today()} />
                    <Field
                      label="Document reference"
                      name="document_ref"
                      className="sm:col-span-2"
                      hint="Storage path of the signed form."
                    />
                    <TextArea label="Notes" name="notes" rows={2} className="sm:col-span-2" />
                  </div>
                </ActionForm>
              )}
            </div>
          </Panel>

          <Panel title="Consent records">
            {consent.length === 0 ? (
              <Empty>No consent on file. Nothing identifying may be published.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Scope</th>
                    <th className={th}>Granted</th>
                    <th className={th}>Revoked</th>
                    <th className={th}>Document</th>
                    <th className={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {consent.map((row) => {
                    const active = !row.revoked_at || row.revoked_at > today();
                    return (
                      <tr key={row.id}>
                        <td className={td}>
                          <Pill tone={active ? "ok" : "neutral"}>{row.scope}</Pill>
                        </td>
                        <td className={`${td} font-mono text-xs`}>{row.granted_at}</td>
                        <td className={`${td} font-mono text-xs`}>{row.revoked_at ?? "—"}</td>
                        <td className={`${td} font-mono text-xs text-ink-2`}>
                          {row.document_ref ?? "—"}
                          {row.notes ? <div className="text-ink-3">{row.notes}</div> : null}
                        </td>
                        <td className={td}>
                          {active ? (
                            <ActionForm
                              action={revokeConsentAction}
                              submitLabel="Revoke"
                              variant="danger"
                              confirm={`Revoke ${row.scope} consent? The storefront must degrade to community-level attribution.`}
                            >
                              <input type="hidden" name="maker_id" value={maker.id} />
                              <input type="hidden" name="consent_id" value={row.id} />
                              <label className="spec block text-ink" htmlFor={`revoked-${row.id}`}>
                                Revoked on
                              </label>
                              <input
                                id={`revoked-${row.id}`}
                                name="revoked_at"
                                type="date"
                                defaultValue={today()}
                                className="border border-rule-strong bg-surface px-2 py-1 text-xs focus:border-ink focus:outline-none"
                              />
                            </ActionForm>
                          ) : (
                            <span className="text-xs text-ink-3">revoked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
