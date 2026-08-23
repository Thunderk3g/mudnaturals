import Link from "next/link";
import { listCodQueue } from "@/server/admin";
import { formatNpr } from "@/lib/money";
import { confirmCodAction, recordRefusalAction } from "../../../actions";
import { ActionForm } from "../../../action-form";
import { Empty, Explain, Money, Note, PageHeader, Panel, Pill, StatusPill, Table, When, numCell, td, th } from "../../../ui";

export const dynamic = "force-dynamic";

/** wa.me wants a bare international number. Nepali mobiles are 10 digits. */
function waLink(phone: string, orderNumber: string, totalPaisa: number) {
  const digits = phone.replace(/\D/g, "");
  const international = digits.length === 10 ? `977${digits}` : digits;
  const message =
    `Namaste, MUD Naturals here about order ${orderNumber} (${formatNpr(totalPaisa)}). ` +
    `Can you confirm you would like it delivered cash on delivery?`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export default async function CodQueuePage() {
  const orders = await listCodQueue();

  return (
    <>
      <PageHeader
        title="Phone confirmations"
        meta={`${orders.length} order${orders.length === 1 ? "" : "s"} waiting, oldest first`}
      />

      <Explain>
        Ring each of these and check the customer still wants the order and the address is right. Until you
        do, the system will not let the parcel be packed.
      </Explain>

      <Note tone="warn">
        Nearly every order in Nepal is paid on the doorstep, and about a quarter of unconfirmed ones come
        straight back. A two-minute call is the cheapest thing on this screen.
      </Note>

      <Panel className="mt-4">
        {orders.length === 0 ? (
          <Empty>Nothing waiting. Every COD order has been confirmed.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Waiting since</th>
                <th className={th}>Status</th>
                <th className={th}>Customer</th>
                <th className={th}>Risk</th>
                <th className={`${th} text-right`}>Items</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th}>Action</th>
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
                    {order.district ? <div className="spec">{order.district}</div> : null}
                  </td>
                  <td className={td}>
                    <When value={order.placed_at} />
                  </td>
                  <td className={td}>
                    <StatusPill status={order.status} />
                  </td>
                  <td className={td}>
                    <div className="text-sm">{order.customer_name ?? "—"}</div>
                    <a
                      href={waLink(order.phone, order.order_number, order.total_paisa)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs underline decoration-rule-strong underline-offset-4 hover:text-clay"
                    >
                      {order.phone} · WhatsApp
                    </a>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={(order.cod_refusals ?? 0) > 0 ? "warn" : "neutral"}>
                        {order.cod_refusals ?? 0} refusals
                      </Pill>
                      {order.is_cod_blocked ? <Pill tone="bad">COD blocked</Pill> : null}
                    </div>
                  </td>
                  <td className={numCell}>{order.item_count}</td>
                  <td className={numCell}>
                    <Money paisa={order.total_paisa} />
                  </td>
                  <td className={td}>
                    <div className="flex flex-col gap-2">
                      <ActionForm action={confirmCodAction} submitLabel="Confirm by phone" variant="primary">
                        <input type="hidden" name="order_id" value={order.id} />
                      </ActionForm>
                      <ActionForm
                        action={recordRefusalAction}
                        submitLabel="Record refusal"
                        variant="danger"
                        confirm={`Record a COD refusal for ${order.order_number}? This increments the customer's refusal count and auto-blocks them past the configured threshold.`}
                      >
                        <input type="hidden" name="order_id" value={order.id} />
                      </ActionForm>
                    </div>
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
