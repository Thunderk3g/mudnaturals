import Link from "next/link";
import { getDashboard } from "@/server/admin";
import {
  Empty,
  Money,
  PageHeader,
  Panel,
  Pill,
  Stat,
  StatusPill,
  Table,
  When,
  numCell,
  td,
  th,
} from "../ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { totals, recent } = await getDashboard();
  const needsReconciling = totals.attempts_open + totals.orders_stuck;

  return (
    <>
      <PageHeader title="Today" meta="All times Kathmandu (UTC+05:45)." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Orders today" value={totals.orders_today} href="/admin/orders" />
        <Stat label="Revenue today" value={<Money paisa={totals.revenue_today_paisa} />} />
        <Stat
          label="Low stock"
          value={totals.low_stock}
          href="/admin/stock"
          tone={totals.low_stock > 0 ? "warn" : "neutral"}
        />
        <Stat
          label="COD to confirm"
          value={totals.cod_pending}
          href="/admin/orders/cod"
          tone={totals.cod_pending > 0 ? "bad" : "ok"}
        />
        <Stat
          label="Needs reconciling"
          value={needsReconciling}
          href="/admin/orders/reconciliation"
          tone={needsReconciling > 0 ? "warn" : "neutral"}
        />
        <Stat label="Open attempts" value={totals.attempts_open} href="/admin/orders/reconciliation" />
      </div>

      <Panel title="Recent orders" className="mt-6">
        {recent.length === 0 ? (
          <Empty>No orders yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Placed</th>
                <th className={th}>Status</th>
                <th className={th}>Method</th>
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
                      {order.payment_method}
                    </Pill>
                    {order.payment_method === "cod" && !order.cod_confirmed_at ? (
                      <span className="ml-1">
                        <Pill tone="bad">unconfirmed</Pill>
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
