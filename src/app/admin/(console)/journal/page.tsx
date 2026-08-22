import Link from "next/link";
import { listJournalPages } from "@/server/admin";
import { createJournalAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { Empty, Field, Note, PageHeader, Panel, Pill, Table, When, td, th } from "../../ui";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const pages = await listJournalPages();

  return (
    <>
      <PageHeader title="Journal" meta={`${pages.length} post${pages.length === 1 ? "" : "s"}`} />

      <Note>
        Edits write a new version row and move the draft pointer. Publishing swaps the published pointer to that
        version — a published version is never edited in place, so the public page never shows a half-finished
        draft.
      </Note>

      <Panel className="mt-4">
        {pages.length === 0 ? (
          <Empty>No journal posts yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Title</th>
                <th className={th}>Slug</th>
                <th className={th}>State</th>
                <th className={th}>Published</th>
                <th className={th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-paper-deep">
                  <td className={td}>
                    <Link
                      href={`/admin/journal/${page.id}`}
                      className="underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{page.slug}</td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={page.published_version_id ? "ok" : "neutral"}>
                        {page.published_version_id ? "live" : "unpublished"}
                      </Pill>
                      {page.has_unpublished_draft ? <Pill tone="warn">draft ahead</Pill> : null}
                    </div>
                  </td>
                  <td className={td}>
                    <When value={page.published_at} />
                  </td>
                  <td className={td}>
                    <When value={page.updated_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="New post" className="mt-4">
        <div className="px-3 py-3">
          <ActionForm action={createJournalAction} submitLabel="Create post" variant="primary" size="md">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" name="title" required />
              <Field label="Slug" name="slug" required hint="lowercase-with-hyphens" />
            </div>
          </ActionForm>
        </div>
      </Panel>
    </>
  );
}
