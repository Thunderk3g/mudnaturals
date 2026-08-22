import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/server/admin";
import {
  advanceStatusAction,
  cancelOrderAction,
  confirmCodAction,
  recordRefundAction,
  recordRefusalAction,
} from "../../../actions";
import { ActionForm } from "../../../action-form";
import {
  AttemptPill,
  Check,
  Empty,
  Field,
  Money,
  Note,
  PageHeader,
  Panel,
  Pill,
  Select,
  StatusPill,
  Table,
  TextArea,
  When,
  numCell,
  td,
  th,
} from "../../../ui";

export const dynamic = "force-dynamic";

const HANDLED = new Set(["packed", "shipped", "delivered", "cancelled"]);

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getOrderDetail(id);
  if (!detail) notFound();

  const { order, items, events, attempts, refunds, nextStatuses } = detail;
  const other = nextStatuses.filter((status) => !HANDLED.has(status));
  const address = order.shipping_address ?? {};

  return (
    <>
      <PageHeader
        title={order.order_number}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <Pill tone={order.payment_method === "cod" ? "warn" : "neutral"}>{order.payment_method}</Pill>
            <Pill tone={order.payment_status === "paid" ? "ok" : "neutral"}>{order.payment_status}</Pill>
            <span className="text-sm text-ink-2">
              placed <When value={order.placed_at} />
            </span>
          </div>
        }
        actions={
          <Link href="/admin/orders" className="text-sm text-ink-2 underline underline-offset-4 hover:text-clay">
            ← All orders
          </Link>
        }
      />

      {order.payment_method === "cod" && !order.cod_confirmed_at ? (
        <Note tone="bad">
          COD not confirmed by phone. The database will refuse to let this order be packed until it is.
        </Note>
      ) : null}
      {order.is_cod_blocked ? (
        <Note tone="bad">
          This customer is COD-blocked after {order.cod_refusals} refusals. Do not dispatch on COD.
        </Note>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Panel title="Line items">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Maker</th>
                  <th className={`${th} text-right`}>Unit</th>
                  <th className={`${th} text-right`}>Qty</th>
                  <th className={`${th} text-right`}>Line</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={td}>
                      <div>{item.product_name}</div>
                      {item.variant_label ? (
                        <div className="text-xs text-ink-2">{item.variant_label}</div>
                      ) : null}
                    </td>
                    <td className={`${td} font-mono text-xs`}>{item.sku}</td>
                    <td className={td}>
                      <div className="text-sm">{item.maker_name ?? <span className="text-ink-3">—</span>}</div>
                      {item.community_name ? (
                        <div className="spec">
                          {item.community_name}
                          {item.district ? ` · ${item.district}` : ""}
                        </div>
                      ) : null}
                      {item.maker_share_paisa != null ? (
                        <div className="spec">
                          share <Money paisa={item.maker_share_paisa} />
                        </div>
                      ) : null}
                    </td>
                    <td className={numCell}>
                      <Money paisa={item.unit_price_paisa} />
                    </td>
                    <td className={numCell}>{item.quantity}</td>
                    <td className={numCell}>
                      <Money paisa={item.line_total_paisa} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className={td} colSpan={5}>
                    Subtotal
                  </td>
                  <td className={numCell}>
                    <Money paisa={order.subtotal_paisa} />
                  </td>
                </tr>
                <tr>
                  <td className={td} colSpan={5}>
                    Shipping
                  </td>
                  <td className={numCell}>
                    <Money paisa={order.shipping_paisa} />
                  </td>
                </tr>
                <tr>
                  <td className={td} colSpan={5}>
                    Discount
                  </td>
                  <td className={numCell}>
                    <Money paisa={-order.discount_paisa} />
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className={td} colSpan={5}>
                    Total
                  </td>
                  <td className={numCell}>
                    <Money paisa={order.total_paisa} />
                  </td>
                </tr>
              </tfoot>
            </Table>
          </Panel>

          <Panel title="Timeline">
            {events.length === 0 ? (
              <Empty>No events.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>Event</th>
                    <th className={th}>Transition</th>
                    <th className={th}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td className={td}>
                        <When value={event.created_at} />
                      </td>
                      <td className={`${td} font-mono text-xs`}>{event.event}</td>
                      <td className={td}>
                        {event.from_status || event.to_status ? (
                          <span className="font-mono text-xs">
                            {event.from_status ?? "—"} → {event.to_status ?? "—"}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className={`${td} font-mono text-xs text-ink-2`}>
                        {event.detail && Object.keys(event.detail).length
                          ? JSON.stringify(event.detail)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Panel>

          <Panel title="Payment attempts">
            {attempts.length === 0 ? (
              <Empty>No eSewa attempts — this order did not go through the gateway.</Empty>
            ) : (
              <div className="divide-y divide-rule">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <AttemptPill status={attempt.status} />
                      <span className="font-mono text-xs text-ink-2">{attempt.id}</span>
                      <Money paisa={attempt.amount_paisa} />
                      <span className="spec">polls {attempt.poll_attempts}</span>
                      {attempt.signature_valid === false ? <Pill tone="bad">bad signature</Pill> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-6 text-xs text-ink-2">
                      <span>
                        created <When value={attempt.created_at} />
                      </span>
                      <span>
                        expires <When value={attempt.expires_at} />
                      </span>
                      <span>
                        last poll <When value={attempt.last_polled_at} />
                      </span>
                      {attempt.esewa_transaction_code ? (
                        <span className="font-mono">code {attempt.esewa_transaction_code}</span>
                      ) : null}
                      {attempt.esewa_ref_id ? (
                        <span className="font-mono">ref {attempt.esewa_ref_id}</span>
                      ) : null}
                    </div>
                    {attempt.events.length ? (
                      <ul className="mt-2 space-y-0.5">
                        {attempt.events.map((event) => (
                          <li key={event.id} className="font-mono text-xs text-ink-2">
                            <When value={event.created_at} /> · {event.source} · {event.event}
                            {event.processed ? "" : " · unprocessed"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Actions">
            <div className="space-y-4 px-3 py-3">
              {order.payment_method === "cod" && !order.cod_confirmed_at ? (
                <>
                  <ActionForm action={confirmCodAction} submitLabel="Confirm COD by phone" variant="primary">
                    <input type="hidden" name="order_id" value={order.id} />
                  </ActionForm>
                  <ActionForm
                    action={recordRefusalAction}
                    submitLabel="Record refusal"
                    variant="danger"
                    confirm="Record a COD refusal? This increments the customer's refusal count and may block them."
                  >
                    <input type="hidden" name="order_id" value={order.id} />
                  </ActionForm>
                </>
              ) : null}

              {nextStatuses.includes("packed") ? (
                <ActionForm action={advanceStatusAction} submitLabel="Mark packed" variant="primary">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="to" value="packed" />
                </ActionForm>
              ) : null}

              {nextStatuses.includes("shipped") ? (
                <ActionForm action={advanceStatusAction} submitLabel="Mark shipped" variant="primary">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="to" value="shipped" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Carrier" name="carrier" required defaultValue={order.carrier ?? ""} />
                    <Field
                      label="Tracking ref"
                      name="tracking_ref"
                      required
                      defaultValue={order.tracking_ref ?? ""}
                    />
                  </div>
                </ActionForm>
              ) : null}

              {nextStatuses.includes("delivered") ? (
                <ActionForm action={advanceStatusAction} submitLabel="Mark delivered" variant="primary">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="to" value="delivered" />
                </ActionForm>
              ) : null}

              {other.length ? (
                <ActionForm action={advanceStatusAction} submitLabel="Apply status">
                  <input type="hidden" name="order_id" value={order.id} />
                  <Select label="Other legal transitions" name="to">
                    {other.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                </ActionForm>
              ) : null}

              {nextStatuses.includes("cancelled") ? (
                <ActionForm
                  action={cancelOrderAction}
                  submitLabel="Cancel order"
                  variant="danger"
                  confirm="Cancel this order?"
                >
                  <input type="hidden" name="order_id" value={order.id} />
                  <TextArea label="Cancellation reason" name="reason" rows={2} required />
                </ActionForm>
              ) : null}

              {nextStatuses.length === 0 ? (
                <p className="text-sm text-ink-2">
                  {order.status.replace(/_/g, " ")} is terminal — no further transitions are legal.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Record a refund">
            <div className="px-3 py-3">
              <p className="mb-2 text-xs text-ink-2">
                eSewa has no refund API. Refund in the merchant portal, then record the reference here.
              </p>
              <ActionForm action={recordRefundAction} submitLabel="Record refund">
                <input type="hidden" name="order_id" value={order.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field
                    label="Amount (Rs)"
                    name="amount_rupees"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={(order.total_paisa / 100).toFixed(2)}
                  />
                  <Select label="Status" name="status" defaultValue="requested">
                    <option value="requested">requested</option>
                    <option value="approved">approved</option>
                    <option value="completed">completed</option>
                    <option value="rejected">rejected</option>
                  </Select>
                </div>
                <Field label="External reference" name="external_reference" className="mt-2" />
                <TextArea label="Reason" name="reason" rows={2} className="mt-2" />
                <div className="mt-2">
                  <Check label="Restock the items" name="restock" defaultChecked />
                </div>
              </ActionForm>
              {refunds.length ? (
                <ul className="mt-3 space-y-1 border-t border-rule pt-2">
                  {refunds.map((refund) => (
                    <li key={refund.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <Pill tone={refund.status === "completed" ? "ok" : "warn"}>{refund.status}</Pill>
                      <Money paisa={refund.amount_paisa} />
                      <When value={refund.created_at} />
                      {refund.external_reference ? (
                        <span className="font-mono text-ink-2">{refund.external_reference}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

          <Panel title="Shipping address (snapshot)">
            <dl className="px-3 py-2 text-sm">
              {Object.entries(address).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-rule py-1 last:border-0">
                  <dt className="spec">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-right font-mono text-xs">{String(value ?? "—")}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-b border-rule py-1">
                <dt className="spec">phone</dt>
                <dd className="text-right font-mono text-xs">{order.phone}</dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="spec">email</dt>
                <dd className="text-right font-mono text-xs">{order.email ?? "—"}</dd>
              </div>
            </dl>
          </Panel>

          {order.is_gift ? (
            <Panel title="Gift">
              <dl className="px-3 py-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-rule py-1">
                  <dt className="spec">recipient</dt>
                  <dd className="text-right">{order.recipient_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-rule py-1">
                  <dt className="spec">recipient phone</dt>
                  <dd className="text-right font-mono text-xs">{order.recipient_phone ?? "—"}</dd>
                </div>
                <div className="py-1">
                  <dt className="spec">note</dt>
                  <dd className="mt-1">{order.gift_note ?? "—"}</dd>
                </div>
              </dl>
            </Panel>
          ) : null}

          <Panel title="Fulfilment">
            <dl className="px-3 py-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-rule py-1">
                <dt className="spec">carrier</dt>
                <dd className="text-right">{order.carrier ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-rule py-1">
                <dt className="spec">tracking</dt>
                <dd className="text-right font-mono text-xs">{order.tracking_ref ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-rule py-1">
                <dt className="spec">cod confirmed</dt>
                <dd className="text-right">
                  <When value={order.cod_confirmed_at} />
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-rule py-1">
                <dt className="spec">paid</dt>
                <dd className="text-right">
                  <When value={order.paid_at} />
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <dt className="spec">delivered</dt>
                <dd className="text-right">
                  <When value={order.delivered_at} />
                </dd>
              </div>
              {order.cancel_reason ? (
                <div className="border-t border-rule py-1">
                  <dt className="spec">cancel reason</dt>
                  <dd className="mt-1">{order.cancel_reason}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
