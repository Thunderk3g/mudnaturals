import { PageBlocks } from "@/components/blocks/page-blocks";

/**
 * The homepage is whatever the console says it is.
 *
 * Everything that used to be written here — hero, categories, the featured
 * collection, the newest objects, the community band and the journal teaser —
 * is now a row in `page_blocks`, seeded with exactly the copy this page shipped
 * with. The layout did not change; the source of it did.
 */
export const revalidate = 300;

export default function HomePage() {
  return <PageBlocks pageKey="home" />;
}
