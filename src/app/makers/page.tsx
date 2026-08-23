import { redirect } from "next/navigation";

/**
 * The makers index is gone; communities took its place at the front of the site.
 *
 * The individual records at `/makers/[slug]` are still real pages — product
 * provenance links straight to them and they carry the workshop's own story —
 * so only the browse-by-person entry point is retired. Anyone arriving on an
 * old link, or on one printed somewhere we cannot edit, lands on the axis the
 * store is actually organised on.
 */
export default function MakersIndexPage() {
  redirect("/communities");
}
