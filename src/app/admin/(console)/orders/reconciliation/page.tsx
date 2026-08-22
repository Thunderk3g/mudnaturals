import Link from "next/link";
import { getReconciliation } from "@/server/admin";
import { reconcileNowAction } from "../../../actions";
import { ActionForm } from "../../../action-form";
import {
  AttemptPill,
  Empty,
  Money,
  Note,
  PageHeader,
  Panel,
  StatusPill,
  Table,
  When,
  numCell,
  td,
  th,
} from "../../../ui";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const { attempts, orders } = await getReconciliation();

  return (
    <>
      <PageHeader
        title="Reconciliation queue"
        meta={`${attempts.length} open attempt${attempts.length === 1 ? "" : "s"} · ${orders.length} order${
          orders.length === 1 ? "" : "s"
        } stuck`}
        actions={
          <ActionForm action={reconcileNowAction} submitLabel="Reconcile now" variant="primary" size="md" />
        }
      />

      <Note tone="warn">
        eSewa ePay v2 has no server-to-server callback, so polling its status API is the only reliable
        confirmation channel. This project runs on Vercel <strong>Hobby</strong>, where cron frequency is capped
        at once per day — so running this by hand is a real operational path, not a fallback, until Pro is
        purchased. Anything sitting here is a customer who may have paid and has nothing to show for it.
      </Note>

      <Panel title="Open payment attempts" className="mt-4">
        {attempts.length === 0 ? (
          <Empty>No attempts in initiated, pending or ambiguous.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Attempt</th>
                <th className={th}>Order</th>
                <th className={th}>Attempt status</th>
                <th className={th}>Order status</th>
                <th className={th}>Created</th>
                <th className={th}>Expires</th>
                <th className={th}>Last poll</th>
                <th className={`${th} text-right`}>Polls</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-paper-deep">
                  <td className={`${td} font-mono text-xs text-ink-2`}>{attempt.id.slice(0, 8)}…</td>
                  <td className={td}>
                    <Link
                      href={`/admin/orders/${attempt.order_id}`}
                      className="font-mono text-xs underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {attempt.order_number}
                    </Link>
                  </td>
                  <td className={td}>
                    <AttemptPill status={attempt.status} />
                  </td>
                  <td className={td}>
                    <StatusPill status={attempt.order_status} />
                  </td>
                  <td className={td}>
                    <When value={attempt.created_at} />
                  </td>
                  <td className={td}>
                    <When value={attempt.expires_at} />
                  </td>
                  <td className={td}>
                    <When value={attempt.last_polled_at} />
                  </td>
                  <td className={numCell}>{attempt.poll_attempts}</td>
                  <td className={numCell}>
                    <Money paisa={attempt.amount_paisa} />
                    {attempt.amount_paisa !== attempt.order_total_paisa ? (
                      <div className="text-xs text-bad">order {attempt.order_total_paisa / 100}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="Orders awaiting a verdict" className="mt-4">
        {orders.length === 0 ? (
          <Empty>No orders in payment verifying or manual review.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Status</th>
                <th className={th}>Placed</th>
                <th className={th}>Phone</th>
                <th className={`${th} text-right`}>Attempts</th>
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
                    <StatusPill status={order.status} />
                  </td>
                  <td className={td}>
                    <When value={order.placed_at} />
                  </td>
                  <td className={`${td} font-mono text-xs`}>{order.phone}</td>
                  <td className={numCell}>{order.attempt_count}</td>
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
