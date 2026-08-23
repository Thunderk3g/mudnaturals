import { getImpact } from "@/server/admin";
import { refreshImpactAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { Empty, Explain, Money, PageHeader, Panel, Stat, Table, When, numCell, td, th } from "../../ui";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const { byMaker, byCommunity, summary } = await getImpact();
  const n = (key: string) => Number(summary[key] ?? 0);

  return (
    <>
      <PageHeader
        title="Impact"
        meta={
          <span>
            Materialised views · generated <When value={String(summary.generated_at)} />
          </span>
        }
        actions={
          <>
            <a
              href="/admin/impact/export"
              className="border border-rule-strong px-3 py-1.5 text-sm hover:border-ink"
              download
            >
              Export CSV
            </a>
            <ActionForm action={refreshImpactAction} submitLabel="Recalculate" variant="primary" size="md" />
          </>
        }
      />

      <Explain>
        What MUD has actually paid workshops, added up from what was recorded as arriving — not an estimate
        and not a claim. The figures are worked out in advance rather than on the fly, so press
        <strong> Recalculate</strong> after recording new stock.
      </Explain>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Revenue" value={<Money paisa={n("revenue_paisa")} />} />
        <Stat label="Paid to makers" value={<Money paisa={n("paid_to_makers_paisa")} />} tone="ok" />
        <Stat label="Units sold" value={n("units_sold")} />
        <Stat label="Makers" value={n("maker_count")} />
        <Stat label="Communities" value={n("community_count")} />
        <Stat label="Districts" value={n("district_count")} />
      </div>

      <Panel title="By maker" className="mt-4">
        {byMaker.length === 0 ? (
          <Empty>Nothing to report yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Maker</th>
                <th className={th}>Community</th>
                <th className={th}>District</th>
                <th className={`${th} text-right`}>Units sold</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Units bought</th>
                <th className={`${th} text-right`}>Paid to maker</th>
                <th className={th}>Since</th>
              </tr>
            </thead>
            <tbody>
              {byMaker.map((row) => (
                <tr key={row.maker_id} className="hover:bg-paper-deep">
                  <td className={td}>{row.maker_name}</td>
                  <td className={td}>{row.community_name}</td>
                  <td className={td}>{row.district}</td>
                  <td className={numCell}>{row.units_sold}</td>
                  <td className={numCell}>
                    <Money paisa={row.revenue_paisa} />
                  </td>
                  <td className={numCell}>{row.units_bought}</td>
                  <td className={numCell}>
                    <Money paisa={row.paid_to_maker_paisa} />
                  </td>
                  <td className={td}>
                    <When value={row.working_with_us_since} time={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <Panel title="By community" className="mt-4">
        {byCommunity.length === 0 ? (
          <Empty>Nothing to report yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Community</th>
                <th className={th}>District</th>
                <th className={`${th} text-right`}>Makers</th>
                <th className={`${th} text-right`}>Units sold</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Paid to makers</th>
              </tr>
            </thead>
            <tbody>
              {byCommunity.map((row) => (
                <tr key={row.community_id} className="hover:bg-paper-deep">
                  <td className={td}>{row.community_name}</td>
                  <td className={td}>{row.district}</td>
                  <td className={numCell}>{row.maker_count}</td>
                  <td className={numCell}>{row.units_sold}</td>
                  <td className={numCell}>
                    <Money paisa={row.revenue_paisa} />
                  </td>
                  <td className={numCell}>
                    <Money paisa={row.paid_to_maker_paisa} />
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
