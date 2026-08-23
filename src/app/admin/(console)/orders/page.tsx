import Link from "next/link";
import { listOrders, PAGE_SIZE, type OrderFilters } from "@/server/admin";
import { Empty, Explain, Money, PageHeader, Panel, Pill, StatusPill, Table, When, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

const STATUSES = [
  "pending_payment",
  "payment_verifying",
  "paid",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "partially_refunded",
  "expired",
  "failed",
  "manual_review",
  "refused",
];

const filterControl =
  "border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

type Search = { status?: string; method?: string; q?: string; from?: string; to?: string; page?: string };

function pageLink(params: Search, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  query.set("page", String(page));
  return `/admin/orders?${query.toString()}`;
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? 1) || 1, 1);
  const filters: OrderFilters = {
    status: params.status || undefined,
    method: params.method || undefined,
    q: params.q || undefined,
    from: params.from || undefined,
    to: params.to || undefined,
    page,
  };
  const orders = await listOrders(filters);

  return (
    <>
      <PageHeader
        title="Orders"
        meta={`Page ${page} · showing ${orders.length} of up to ${PAGE_SIZE}`}
        actions={
          <>
            <Link href="/admin/orders/cod" className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay">
              Phone confirmations
            </Link>
            <Link
              href="/admin/orders/reconciliation"
              className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay"
            >
              Payments to check
            </Link>
          </>
        }
      />

      <Explain>
        Every order ever placed. Open one to move it along, refund it, or read what has happened to it so far.
        Filters below end up in the address bar, so a filtered list can be sent to someone else as a link.
      </Explain>

      {/* A plain GET form: filters end up in the URL, so a filtered view is
          shareable and the back button behaves. No client JavaScript. */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="q" className="spec mb-1 block text-ink">
            Order no. / phone / email
          </label>
          <input id="q" name="q" defaultValue={params.q ?? ""} placeholder="MUD-…" className={filterControl} />
        </div>
        <div>
          <label htmlFor="status" className="spec mb-1 block text-ink">
            Status
          </label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className={filterControl}>
            <option value="">Any</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="method" className="spec mb-1 block text-ink">
            Payment
          </label>
          <select id="method" name="method" defaultValue={params.method ?? ""} className={filterControl}>
            <option value="">Any</option>
            <option value="cod">COD</option>
            <option value="esewa">eSewa</option>
          </select>
        </div>
        <div>
          <label htmlFor="from" className="spec mb-1 block text-ink">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={params.from ?? ""} className={filterControl} />
        </div>
        <div>
          <label htmlFor="to" className="spec mb-1 block text-ink">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={params.to ?? ""} className={filterControl} />
        </div>
        <button type="submit" className="border border-clay bg-clay px-3 py-1.5 text-sm text-paper hover:bg-[#9d4826]">
          Filter
        </button>
        <Link href="/admin/orders" className="px-2 py-1.5 text-sm text-ink-2 underline underline-offset-4">
          Reset
        </Link>
      </form>

      <Panel>
        {orders.length === 0 ? (
          <Empty>No orders match those filters.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Placed</th>
                <th className={th}>Status</th>
                <th className={th}>Payment</th>
                <th className={th}>Contact</th>
                <th className={`${th} text-right`}>Items</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-paper-deep">
                  <td className={td}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className={td}>
                    <When value={order.placed_at} />
                  </td>
                  <td className={td}>
                    <StatusPill status={order.status} />
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={order.payment_method === "cod" ? "warn" : "neutral"}>
                        {order.payment_method}
                      </Pill>
                      <Pill tone={order.payment_status === "paid" ? "ok" : "neutral"}>
                        {order.payment_status}
                      </Pill>
                      {order.payment_method === "cod" && !order.cod_confirmed_at ? (
                        <Pill tone="bad">unconfirmed</Pill>
                      ) : null}
                    </div>
                  </td>
                  <td className={`${td} font-mono text-xs`}>
                    <div>{order.phone}</div>
                    {order.email ? <div className="text-ink-2">{order.email}</div> : null}
                  </td>
                  <td className={numCell}>{order.item_count}</td>
                  <td className={numCell}>
                    <Money paisa={order.total_paisa} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <nav className="mt-3 flex items-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 ? (
          <Link href={pageLink(params, page - 1)} className="underline underline-offset-4 hover:text-clay">
            ← Previous
          </Link>
        ) : null}
        {orders.length === PAGE_SIZE ? (
          <Link href={pageLink(params, page + 1)} className="underline underline-offset-4 hover:text-clay">
            Next →
          </Link>
        ) : null}
      </nav>
    </>
  );
}
