import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BLOCK_SPECS,
  BLOCK_TYPES,
  PAGE_KEYS,
  blockSummary,
  type BlockType,
  type PageKey,
} from "@/lib/blocks";
import { getPageBlocksForEdit } from "@/server/cms";
import { ActionForm } from "../../../action-form";
import { createBlockAction, moveBlockAction, toggleBlockAction } from "../../../cms-actions";
import { Empty, Explain, PageHeader, Panel, Pill } from "../../../ui";

/**
 * A page is a list of sections, top to bottom, in the order a visitor scrolls
 * past them. Everything an operator can do to one is on this screen: reorder,
 * take down, put back, open, add.
 *
 * Deliberately not drag-and-drop. Up and down arrows work on a phone, work with
 * a keyboard, survive a page reload, and cannot half-commit a reorder — which
 * matters more here than the few seconds dragging would save.
 */

export const dynamic = "force-dynamic";

function isPageKey(value: string): value is PageKey {
  return PAGE_KEYS.some((p) => p.key === value);
}

export default async function WebsitePage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!isPageKey(page)) notFound();

  const meta = PAGE_KEYS.find((p) => p.key === page)!;
  const blocks = await getPageBlocksForEdit(page);
  const liveCount = blocks.filter((b) => b.is_visible).length;

  return (
    <>
      <PageHeader
        title={meta.label}
        meta={`${liveCount} section${liveCount === 1 ? "" : "s"} live · ${blocks.length - liveCount} hidden`}
        actions={
          <a
            href={meta.path}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm border border-rule-strong px-3 py-1.5 text-sm transition-colors hover:border-ink hover:bg-surface"
          >
            View page ↗
          </a>
        }
      />

      <nav aria-label="Pages" className="mb-5 flex flex-wrap gap-1 border-b border-rule">
        {PAGE_KEYS.map((entry) => (
          <Link
            key={entry.key}
            href={`/admin/website/${entry.key}`}
            aria-current={entry.key === page ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              entry.key === page
                ? "border-clay text-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            }`}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      <Explain>
        {meta.note} Sections stack down the page in this order. Change one by opening it, move it
        with the arrows, or take it down with <strong>Hide</strong> — hiding keeps everything you
        wrote, it just stops visitors seeing it.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Panel title="Sections, top to bottom">
          {blocks.length === 0 ? (
            <Empty>
              This page has no sections yet, so it is blank. Add one from the panel on the right.
            </Empty>
          ) : (
            <ol>
              {blocks.map((block, index) => (
                <li
                  key={block.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule px-3 py-3 last:border-b-0"
                >
                  <span className="font-mono text-xs text-ink-3 tabular-nums">{index + 1}</span>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/website/${page}/${block.id}`}
                      className="block truncate font-medium text-ink hover:text-clay hover:underline"
                    >
                      {blockSummary(block.block_type, block.data)}
                    </Link>
                    <p className="spec mt-0.5">{BLOCK_SPECS[block.block_type].label}</p>
                  </div>

                  {block.is_visible ? <Pill tone="ok">Live</Pill> : <Pill tone="neutral">Hidden</Pill>}

                  <div className="flex items-center gap-1">
                    <ActionForm action={moveBlockAction} submitLabel="↑" compact>
                      <input type="hidden" name="id" value={block.id} />
                      <input type="hidden" name="page_key" value={page} />
                      <input type="hidden" name="direction" value="up" />
                    </ActionForm>
                    <ActionForm action={moveBlockAction} submitLabel="↓" compact>
                      <input type="hidden" name="id" value={block.id} />
                      <input type="hidden" name="page_key" value={page} />
                      <input type="hidden" name="direction" value="down" />
                    </ActionForm>
                    <ActionForm action={toggleBlockAction} submitLabel={block.is_visible ? "Hide" : "Show"} compact>
                      <input type="hidden" name="id" value={block.id} />
                      <input type="hidden" name="page_key" value={page} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Add a section">
          <div className="px-3 py-3">
            <ActionForm action={createBlockAction} submitLabel="Add it" variant="primary" size="md">
              <input type="hidden" name="page_key" value={page} />
              <label htmlFor="f-block_type" className="spec mb-1 block text-ink">
                What kind of section
              </label>
              <select
                id="f-block_type"
                name="block_type"
                defaultValue="rich_text"
                className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
              >
                {BLOCK_TYPES.map((type: BlockType) => (
                  <option key={type} value={type}>
                    {BLOCK_SPECS[type].label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">
                It is added at the bottom, hidden, and opens straight away so you can fill it in.
                Nothing appears on the site until you tick <strong>Show this section</strong>.
              </p>
            </ActionForm>
          </div>

          <div className="border-t border-rule px-3 py-3">
            <h3 className="spec mb-2 text-ink">What each one does</h3>
            <dl className="space-y-2.5">
              {BLOCK_TYPES.map((type: BlockType) => (
                <div key={type}>
                  <dt className="text-sm font-medium text-ink">{BLOCK_SPECS[type].label}</dt>
                  <dd className="text-xs leading-relaxed text-ink-2">{BLOCK_SPECS[type].description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Panel>
      </div>
    </>
  );
}
