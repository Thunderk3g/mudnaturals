import { hasSession } from "@/lib/admin-auth";
import { impactCsv } from "@/server/admin";

/**
 * A download, not a mutation — mutations are Server Actions only. It still
 * re-verifies the session itself rather than trusting middleware.
 */
export async function GET() {
  if (!(await hasSession())) return new Response("Unauthorized", { status: 401 });

  const csv = await impactCsv();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="mud-impact-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
