import { listCommunities } from "@/server/admin";
import { saveCommunityAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { Empty, Field, PageHeader, Panel, PublishPill, Select, Table, TextArea, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

function CommunityFields({
  community,
}: {
  community?: {
    slug: string;
    name: string;
    district: string;
    province: string | null;
    summary: string | null;
    story: string | null;
    maker_count: number | null;
    working_since: number | null;
    status: string;
  };
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Name" name="name" required defaultValue={community?.name ?? ""} />
      <Field label="Slug" name="slug" required defaultValue={community?.slug ?? ""} hint="lowercase-with-hyphens" />
      <Field label="District" name="district" required defaultValue={community?.district ?? ""} />
      <Field label="Province" name="province" defaultValue={community?.province ?? ""} />
      <Field
        label="Maker count"
        name="maker_count"
        type="number"
        min="0"
        defaultValue={community?.maker_count ?? ""}
      />
      <Field
        label="Working since"
        name="working_since"
        type="number"
        min="1900"
        max="2100"
        defaultValue={community?.working_since ?? ""}
      />
      <Select label="Status" name="status" defaultValue={community?.status ?? "draft"}>
        <option value="draft">draft</option>
        <option value="published">published</option>
        <option value="archived">archived</option>
      </Select>
      <TextArea
        label="Summary"
        name="summary"
        rows={2}
        defaultValue={community?.summary ?? ""}
        className="sm:col-span-2 lg:col-span-4"
      />
      <TextArea
        label="Story"
        name="story"
        rows={4}
        defaultValue={community?.story ?? ""}
        className="sm:col-span-2 lg:col-span-4"
      />
    </div>
  );
}

export default async function CommunitiesPage() {
  const communities = await listCommunities();

  return (
    <>
      <PageHeader title="Communities" meta={`${communities.length} on file`} />

      <Panel>
        {communities.length === 0 ? (
          <Empty>No communities yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Community</th>
                <th className={th}>District</th>
                <th className={th}>Province</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Makers linked</th>
                <th className={`${th} text-right`}>Stated makers</th>
              </tr>
            </thead>
            <tbody>
              {communities.map((community) => (
                <tr key={community.id} className="hover:bg-paper-deep">
                  <td className={td}>
                    <details>
                      <summary className="cursor-pointer underline decoration-rule-strong underline-offset-4 hover:text-clay">
                        {community.name}
                      </summary>
                      <div className="mt-3 border border-rule bg-paper p-3">
                        <ActionForm action={saveCommunityAction} submitLabel="Save community" variant="primary">
                          <input type="hidden" name="community_id" value={community.id} />
                          <CommunityFields community={community} />
                        </ActionForm>
                      </div>
                    </details>
                    <div className="spec">{community.slug}</div>
                  </td>
                  <td className={td}>{community.district}</td>
                  <td className={td}>{community.province ?? <span className="text-ink-3">—</span>}</td>
                  <td className={td}>
                    <PublishPill status={community.status} />
                  </td>
                  <td className={numCell}>{community.linked_makers}</td>
                  <td className={numCell}>{community.maker_count ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Add a community" className="mt-4">
        <div className="px-3 py-3">
          <ActionForm action={saveCommunityAction} submitLabel="Create community" variant="primary" size="md">
            <CommunityFields />
          </ActionForm>
        </div>
      </Panel>
    </>
  );
}
