import { listMedia } from "@/server/admin-cms";
import { ActionForm } from "../../action-form";
import { deleteMediaAction, updateMediaAction, uploadMediaAction } from "../../cms-actions";
import { Empty, Explain, PageHeader, Panel, Pill } from "../../ui";

/**
 * The photo library. Every image on the site that was not shipped with the
 * build lives here, and every picker elsewhere in the console chooses from it.
 *
 * Two things are enforced rather than suggested. A photo cannot be deleted
 * while anything still uses it — the count is on the card, and the action
 * refuses with the number. And uploading the same file twice gives the same
 * photo back rather than a duplicate, so replacing an image everywhere is one
 * change rather than a hunt.
 */

export const dynamic = "force-dynamic";

function fileSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const media = await listMedia({ q });

  return (
    <>
      <PageHeader title="Photos" meta={`${media.length} in the library`} />

      <Explain>
        Upload a photo here once, then choose it anywhere on the site. Everything is resized and
        converted automatically, so you can upload straight off a camera or a phone. Write a
        description for every photo — it is what someone using a screen reader hears, and what
        search engines read.
      </Explain>

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr] lg:items-start">
        <Panel title="Add a photo">
          <div className="px-3 py-3">
            <ActionForm action={uploadMediaAction} submitLabel="Upload" variant="primary" size="md">
              <label htmlFor="f-file" className="spec mb-1 block text-ink">
                Choose a file
              </label>
              <input
                id="f-file"
                name="file"
                type="file"
                accept="image/*"
                required
                className="w-full text-sm text-ink-2 file:mr-2 file:rounded-sm file:border file:border-rule-strong file:bg-surface file:px-2.5 file:py-1.5 file:text-sm"
              />

              <label htmlFor="f-alt" className="spec mt-3 mb-1 block text-ink">
                Describe what is in it
              </label>
              <input
                id="f-alt"
                name="alt"
                placeholder="A woman weaving a nettle-fibre bag"
                className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
              />
              <p className="mt-2 text-xs leading-relaxed text-ink-2">
                JPEG, PNG or WebP, up to 15 MB. Large photos are shrunk to fit — you do not need to
                resize anything first.
              </p>
            </ActionForm>
          </div>

          <form className="border-t border-rule px-3 py-3">
            <label htmlFor="f-q" className="spec mb-1 block text-ink">
              Search the library
            </label>
            <input
              id="f-q"
              name="q"
              defaultValue={q ?? ""}
              placeholder="File name or description"
              className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
            />
          </form>
        </Panel>

        <Panel title={q ? `Photos matching “${q}”` : "Everything in the library"}>
          {media.length === 0 ? (
            <Empty>
              {q
                ? "No photos match that. Try part of a file name, or clear the search."
                : "No photos yet. Upload one on the left and it becomes available everywhere on the site."}
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2 xl:grid-cols-3">
              {media.map((asset) => (
                <li key={asset.id} className="bg-surface p-3">
                  <div className="flex gap-3">
                    <div className="h-24 w-[76px] shrink-0 overflow-hidden rounded-sm border border-rule">
                      {/* eslint-disable-next-line @next/next/no-img-element -- console
                          thumbnail; the optimiser would cost a transform per row
                          for pictures only staff ever see. */}
                      <img
                        src={`/api/media/${asset.id}`}
                        alt={asset.alt || asset.filename}
                        loading="lazy"
                        className="h-full w-full bg-paper-deep object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <p className="spec mt-0.5">
                        {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                        {fileSize(asset.bytes)}
                      </p>
                      <p className="mt-1.5">
                        {asset.uses > 0 ? (
                          <Pill tone="info">
                            Used in {asset.uses} place{asset.uses === 1 ? "" : "s"}
                          </Pill>
                        ) : (
                          <Pill tone="neutral">Not used yet</Pill>
                        )}
                      </p>
                    </div>
                  </div>

                  <ActionForm action={updateMediaAction} submitLabel="Save description" className="mt-3">
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="focal_point" value={asset.focal_point} />
                    <label htmlFor={`alt-${asset.id}`} className="spec mb-1 block text-ink">
                      Description
                    </label>
                    <input
                      id={`alt-${asset.id}`}
                      name="alt"
                      defaultValue={asset.alt}
                      placeholder="Describe what is in the photo"
                      className="w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm focus:border-ink focus:outline-none"
                    />
                  </ActionForm>

                  {asset.uses === 0 ? (
                    <ActionForm
                      action={deleteMediaAction}
                      submitLabel="Delete"
                      variant="danger"
                      confirm="Delete this photo for good?"
                      className="mt-2"
                    >
                      <input type="hidden" name="id" value={asset.id} />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
