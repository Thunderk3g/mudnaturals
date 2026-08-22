import Link from "next/link";
import { getFormOptions, listLedger, listStock, listVariantsForIntake } from "@/server/admin";
import { recordIntakeAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { Empty, Field, Money, Note, PageHeader, Panel, Pill, Select, Table, When, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const [levels, ledger, variants, options] = await Promise.all([
    listStock(),
    listLedger(150),
    listVariantsForIntake(),
    getFormOptions(),
  ]);
  const low = levels.filter((level) => level.available <= level.low_stock_threshold).length;

  return (
    <>
      <PageHeader title="Stock" meta={`${levels.length} variants · ${low} at or below threshold`} />

      <Note>
        Stock moves only through intake. The ledger rejects UPDATE and DELETE at the database level, so the
        history below is read-only by construction. Intake is the wholesale purchase event: MUD buys the piece
        outright, which is why unit cost is captured here and why there is no payout ledger anywhere.
      </Note>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Panel title="Current levels">
          {levels.length === 0 ? (
            <Empty>No variants yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>SKU</th>
                  <th className={th}>Maker</th>
                  <th className={`${th} text-right`}>On hand</th>
                  <th className={`${th} text-right`}>Reserved</th>
                  <th className={`${th} text-right`}>Available</th>
                  <th className={th}>Level</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.variant_id} className="hover:bg-paper-deep">
                    <td className={td}>
                      <Link
                        href={`/admin/products/${level.product_id}`}
                        className="underline decoration-rule-strong underline-offset-4 hover:text-clay"
                      >
                        {level.product_name}
                      </Link>
                      {level.option_value ? <div className="spec">{level.option_value}</div> : null}
                    </td>
                    <td className={`${td} font-mono text-xs`}>{level.sku}</td>
                    <td className={td}>{level.maker_name ?? <span className="text-ink-3">—</span>}</td>
                    <td className={numCell}>{level.on_hand}</td>
                    <td className={numCell}>{level.reserved}</td>
                    <td className={numCell}>{level.available}</td>
                    <td className={td}>
                      {level.available <= 0 ? (
                        <Pill tone="bad">out of stock</Pill>
                      ) : level.available <= level.low_stock_threshold ? (
                        <Pill tone="warn">low (≤{level.low_stock_threshold})</Pill>
                      ) : (
                        <Pill tone="ok">ok</Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Record intake">
          <div className="px-3 py-3">
            <ActionForm action={recordIntakeAction} submitLabel="Record intake" variant="primary" size="md">
              <div className="grid gap-3">
                <Select label="Variant" name="variant_id" required defaultValue="">
                  <option value="">Choose…</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                    </option>
                  ))}
                </Select>
                <Select label="Maker" name="maker_id" required defaultValue="">
                  <option value="">Choose…</option>
                  {options.makers.map((maker) => (
                    <option key={maker.id} value={maker.id}>
                      {maker.name}
                    </option>
                  ))}
                </Select>
                <Select label="Community" name="community_id" required defaultValue="">
                  <option value="">Choose…</option>
                  {options.communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name}
                    </option>
                  ))}
                </Select>
                <Field label="Quantity" name="quantity" type="number" min="1" step="1" required />
                <Field
                  label="Unit cost paid to maker (Rs)"
                  name="unit_cost_rupees"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
                <Field label="Batch reference" name="batch_ref" hint="Optional purchase or trip reference." />
              </div>
            </ActionForm>
          </div>
        </Panel>
      </div>

      <Panel title="Stock ledger — append only" className="mt-4">
        {ledger.length === 0 ? (
          <Empty>No movements recorded.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Product</th>
                <th className={th}>SKU</th>
                <th className={th}>Reason</th>
                <th className={`${th} text-right`}>Delta</th>
                <th className={`${th} text-right`}>Unit cost</th>
                <th className={th}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className={td}>
                    <When value={entry.created_at} />
                  </td>
                  <td className={td}>{entry.product_name}</td>
                  <td className={`${td} font-mono text-xs`}>{entry.sku}</td>
                  <td className={td}>
                    <Pill tone={entry.reason === "intake" ? "ok" : entry.reason === "sale" ? "info" : "neutral"}>
                      {entry.reason}
                    </Pill>
                  </td>
                  <td className={numCell}>
                    <span className={entry.delta < 0 ? "text-bad" : "text-ok"}>
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </span>
                  </td>
                  <td className={numCell}>
                    {entry.unit_cost_paisa == null ? "—" : <Money paisa={entry.unit_cost_paisa} />}
                  </td>
                  <td className={`${td} font-mono text-xs text-ink-2`}>
                    {entry.order_number ?? entry.batch_ref ?? entry.note ?? "—"}
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
