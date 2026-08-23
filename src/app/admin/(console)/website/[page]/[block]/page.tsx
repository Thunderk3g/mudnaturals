import { notFound } from "next/navigation";
import { BLOCK_SPECS, PAGE_KEYS, type PageKey } from "@/lib/blocks";
import { getBlockForEdit } from "@/server/cms";
import { getPickerOptions, listMedia } from "@/server/admin-cms";
import { ActionForm } from "../../../../action-form";
import { BlockEditor } from "../../../../block-editor";
import { deleteBlockAction } from "../../../../cms-actions";
import { Crumbs, Explain, PageHeader } from "../../../../ui";

export const dynamic = "force-dynamic";

function isPageKey(value: string): value is PageKey {
  return PAGE_KEYS.some((p) => p.key === value);
}

export default async function EditBlockPage({
  params,
}: {
  params: Promise<{ page: string; block: string }>;
}) {
  const { page, block: blockId } = await params;
  if (!isPageKey(page)) notFound();

  const [block, library, options] = await Promise.all([
    getBlockForEdit(blockId),
    listMedia(),
    getPickerOptions(),
  ]);

  // A block that belongs to a different page reached through this URL is a
  // stale link, not a page worth rendering.
  if (!block || block.page_key !== page) notFound();

  const meta = PAGE_KEYS.find((p) => p.key === page)!;
  const spec = BLOCK_SPECS[block.block_type];

  return (
    <>
      <PageHeader
        title={spec.label}
        crumbs={
          <Crumbs
            trail={[
              { label: "Website", href: "/admin/website" },
              { label: meta.label, href: `/admin/website/${page}` },
              { label: spec.label },
            ]}
          />
        }
        actions={
          <>
            <a
              href={meta.path}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors hover:border-ink hover:bg-surface"
            >
              View page ↗
            </a>
            <ActionForm
              action={deleteBlockAction}
              submitLabel="Delete section"
              variant="danger"
              compact
              confirm="Delete this section? Everything written in it is lost. To take it off the site without losing it, untick 'Show this section' instead."
            >
              <input type="hidden" name="id" value={block.id} />
              <input type="hidden" name="page_key" value={page} />
            </ActionForm>
          </>
        }
      />

      <Explain>{spec.description} Changes go live on the site the moment you save.</Explain>

      <BlockEditor
        block={block}
        library={library.map((m) => ({ id: m.id, filename: m.filename, alt: m.alt }))}
        options={options}
      />
    </>
  );
}
