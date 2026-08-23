import Link from "next/link";
import { getDashboard } from "@/server/admin";
import {
  Empty,
  Kpi,
  Money,
  PageHeader,
  Panel,
  Pill,
  StatusPill,
  Table,
  When,
  numCell,
  td,
  th,
} from "../ui";

export const dynamic = "force-dynamic";

/**
 * The first screen after signing in.
 *
 * Two halves, on purpose. The top says what needs doing and links straight at
 * it, because the whole point of opening this is to find the thing that is
 * waiting. The bottom is the shop's numbers. Nothing here is a metric for its
 * own sake — every tile is either an amount of money or a queue with a name.
 */
export default async function DashboardPage() {
  const { totals, recent } = await getDashboard();

  const jobs = [
    {
      count: totals.cod_pending,
      href: "/admin/orders/cod",
      title: "orders waiting on a phone call",
      done: "No orders are waiting on a phone call.",
      hint: "Cash-on-delivery orders cannot be packed until someone confirms them by phone.",
    },
    {
      count: totals.orders_stuck,
      href: "/admin/orders/reconciliation",
      title: "payments we could not confirm",
      done: "Every payment is accounted for.",
      hint: "eSewa does not always tell us the outcome. These need checking against the gateway.",
    },
    {
      count: totals.low_stock,
      href: "/admin/stock",
      title: "products running low",
      done: "Nothing is running low.",
      hint: "Record what arrives from the workshops to bring these back up.",
    },
  ];

  const waiting = jobs.filter((job) => job.count > 0);

  return (
    <>
      <PageHeader
        title="Today"
        meta="Every time on this screen is Kathmandu time."
        actions={
          <Link
            href="/admin/products/new"
            className="rounded-sm border border-clay bg-clay px-3 py-1.5 text-sm text-paper transition-colors hover:bg-[#9d4826]"
          >
            + New product
          </Link>
        }
      />

      <Panel title={waiting.length ? "Needs you" : "Nothing needs you"} className="mb-5">
        {waiting.length === 0 ? (
          <Empty>
            Every queue is clear — no calls to make, no payments to chase, nothing running low.
          </Empty>
        ) : (
          <ul>
            {waiting.map((job) => (
              <li key={job.href} className="border-b border-rule last:border-b-0">
                <Link
                  href={job.href}
                  className="flex items-baseline gap-3 px-3 py-3 transition-colors hover:bg-paper-deep"
                >
                  <span className="font-mono text-2xl leading-none text-clay tabular-nums">
                    {job.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{job.title}</span>
                    <span className="block text-xs text-ink-2">{job.hint}</span>
                  </span>
                  <span className="text-ink-2">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Orders today" value={totals.orders_today} href="/admin/orders" />
        <Kpi label="Taken today" value={<Money paisa={totals.revenue_today_paisa} />} />
        <Kpi
          label="Running low"
          value={totals.low_stock}
          href="/admin/stock"
          tone={totals.low_stock > 0 ? "warn" : "neutral"}
          foot={totals.low_stock > 0 ? "At or below the reorder point" : "All above the reorder point"}
        />
        <Kpi
          label="Payments open"
          value={totals.attempts_open}
          href="/admin/orders/reconciliation"
          foot="Started at eSewa, not yet resolved"
        />
      </div>

      <Panel
        title="Latest orders"
        actions={
          <Link href="/admin/orders" className="text-sm text-ink-2 underline underline-offset-4 hover:text-ink">
            See all
          </Link>
        }
      >
        {recent.length === 0 ? (
          <Empty>No orders yet. They will appear here the moment one is placed.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Placed</th>
                <th className={th}>Where it is</th>
                <th className={th}>Paid by</th>
                <th className={th}>Phone</th>
                <th className={`${th} text-right`}>Items</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((order) => (
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
                    <Pill tone={order.payment_method === "cod" ? "warn" : "neutral"}>
                      {order.payment_method === "cod" ? "on delivery" : order.payment_method}
                    </Pill>
                    {order.payment_method === "cod" && !order.cod_confirmed_at ? (
                      <span className="ml-1">
                        <Pill tone="bad">not confirmed</Pill>
                      </span>
                    ) : null}
                  </td>
                  <td className={`${td} font-mono text-xs`}>{order.phone}</td>
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
    </>
  );
}
