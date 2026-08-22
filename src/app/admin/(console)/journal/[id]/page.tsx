import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournalPage } from "@/server/admin";
import { publishJournalAction, saveJournalAction, unpublishJournalAction } from "../../../actions";
import { ActionForm } from "../../../action-form";
import { Field, Note, PageHeader, Panel, Pill, Table, TextArea, When, td, th } from "../../../ui";

export const dynamic = "force-dynamic";

export default async function JournalEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getJournalPage(id);
  if (!data) notFound();

  const { page, versions, current, products } = data;
  const body = (current?.blocks ?? []).map((block) => block.text).join("\n\n");
  const selected = new Set(current?.product_ids ?? []);
  const draftAhead = page.draft_version_id && page.draft_version_id !== page.published_version_id;

  return (
    <>
      <PageHeader
        title={page.title}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={page.published_version_id ? "ok" : "neutral"}>
              {page.published_version_id ? "live" : "unpublished"}
            </Pill>
            {draftAhead ? <Pill tone="warn">draft ahead of live</Pill> : null}
            <span className="spec">{page.slug}</span>
          </div>
        }
        actions={
          <>
            <Link href="/admin/journal" className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay">
              ← All posts
            </Link>
            <ActionForm action={publishJournalAction} submitLabel="Publish draft" variant="primary">
              <input type="hidden" name="page_id" value={page.id} />
            </ActionForm>
            {page.published_version_id ? (
              <ActionForm
                action={unpublishJournalAction}
                submitLabel="Unpublish"
                variant="danger"
                confirm="Take this post off the public site? The draft is kept."
              >
                <input type="hidden" name="page_id" value={page.id} />
              </ActionForm>
            ) : null}
          </>
        }
      />

      {draftAhead ? (
        <Note tone="warn">There are unpublished edits. The public page still shows the last published version.</Note>
      ) : null}

      <ActionForm action={saveJournalAction} submitLabel="Save draft" variant="primary" size="md" className="mt-4">
        <input type="hidden" name="page_id" value={page.id} />

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="Content">
            <div className="grid gap-3 px-3 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" name="title" required defaultValue={page.title} />
                <Field label="Slug" name="slug" required defaultValue={page.slug} />
                <Field label="Author" name="author" defaultValue={current?.author ?? ""} />
                <Field label="Hero image path" name="hero_image" defaultValue={current?.hero_image ?? ""} />
              </div>
              <TextArea label="Excerpt" name="excerpt" rows={2} defaultValue={current?.excerpt ?? ""} />
              <TextArea
                label="Body"
                name="body"
                rows={18}
                defaultValue={body}
                hint="Blank lines separate paragraphs. Each paragraph is stored as its own block."
              />
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel title="Shop this story">
              <div className="px-3 py-3">
                <label htmlFor="product_ids" className="spec mb-1 block text-ink">
                  Products in the rail
                </label>
                <select
                  id="product_ids"
                  name="product_ids"
                  multiple
                  size={12}
                  defaultValue={Array.from(selected)}
                  className="w-full border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink-2">
                  Ctrl/Cmd-click for several. Only published products can be picked — every story surface is
                  shoppable.
                </p>
              </div>
            </Panel>

            <Panel title="Version history">
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Created</th>
                    <th className={th}>Pointer</th>
                    <th className={th}>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td className={td}>
                        <When value={version.created_at} />
                      </td>
                      <td className={td}>
                        <div className="flex flex-wrap gap-1">
                          {version.id === page.draft_version_id ? <Pill tone="warn">draft</Pill> : null}
                          {version.id === page.published_version_id ? <Pill tone="ok">live</Pill> : null}
                        </div>
                      </td>
                      <td className={td}>
                        <When value={version.published_at} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      </ActionForm>
    </>
  );
}
