import type { Metadata } from "next";
import Link from "next/link";
import { getImpactSummary, listImpactByCommunity, getSettings } from "@/server/queries";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { SpecList } from "@/components/ui/spec";
import { ImpactFlow } from "@/components/story/impact-flow";
import { formatNpr } from "@/lib/money";
import { copy } from "@/content/copy";
import { storyCopy, formatSpecDate } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.impact.title,
  description: `${copy.impact.tradeBody} ${storyCopy.impact.fundHeadline}.`,
  alternates: { canonical: "/impact" },
};

type ImpactSettings = {
  maker_share_published?: boolean;
  fund_formula?: string;
};

/** `impact_summary()` returns jsonb, so every field arrives as `unknown`. */
function num(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function Count({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-t border-rule pt-4">
      <p className="spec">{label}</p>
      <p className="mt-2 font-mono text-4xl tabular-nums tracking-tight text-ink lg:text-5xl">
        {value ?? "—"}
      </p>
    </div>
  );
}

export default async function ImpactPage() {
  const [summary, byCommunity, settings] = await Promise.all([
    getImpactSummary(),
    listImpactByCommunity(),
    getSettings<ImpactSettings>("impact"),
  ]);

  // Defaulted off. `maker_share_published` is false in `settings` and
  // `maker_share_paisa` is null on every product, so no money-flow figure and
  // no per-object percentage is rendered until someone flips this deliberately.
  const showMoneyFlow = settings?.maker_share_published === true;

  const generatedAt = formatSpecDate(
    typeof summary.generated_at === "string" ? summary.generated_at : null,
  );

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.impact.title }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{storyCopy.impact.eyebrow}</p>
            <h1 className="text-4xl lg:text-5xl">{copy.impact.title}</h1>
            <p className="spec mt-6 border-l-2 border-clay pl-4 text-ink">
              {storyCopy.impact.philosophy}
            </p>
          </div>
          <Prose className="lg:col-span-7 text-lg">
            <p>{storyCopy.impact.lede}</p>
          </Prose>
        </div>
      </Section>

      {/* Layer one. The purchase is the big claim and it goes first, because a
          fund is not what pays a weaver this month. */}
      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-3">{storyCopy.impact.tradeEyebrow}</p>
            <h2 className="text-3xl lg:text-4xl">{copy.impact.tradeTitle}</h2>
          </div>
          <Prose className="lg:col-span-7 text-lg">
            <p className="text-ink">{copy.impact.tradeBody}</p>
            {storyCopy.impact.tradeDetail.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </Prose>
        </div>
      </Section>

      {/* Layer two. */}
      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-3">{storyCopy.impact.fundEyebrow}</p>
            <h2 className="text-3xl lg:text-4xl">{copy.impact.fundTitle}</h2>
            <p className="mt-5 font-serif text-2xl leading-snug text-clay">
              {storyCopy.impact.fundHeadline}
            </p>
          </div>
          <Prose className="lg:col-span-7 text-lg">
            <p className="text-ink">{copy.impact.fundBody}</p>
            {storyCopy.impact.fundDetail.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </Prose>
        </div>

        <div className="mt-16">
          <h3 className="text-2xl">{storyCopy.impact.flowTitle}</h3>
          <ImpactFlow className="mt-8" />
          <p className="spec mt-4 max-w-[60ch] leading-relaxed">{storyCopy.impact.flowCaption}</p>
          {settings?.fund_formula ? (
            <SpecList
              className="mt-8 max-w-xl"
              items={[
                { label: storyCopy.impact.fundFormulaLabel, value: settings.fund_formula },
              ]}
            />
          ) : null}
        </div>
      </Section>

      {/* Live counts, in the mono register, and only what is genuinely
          computable from the ledger. */}
      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-3">{storyCopy.impact.countsEyebrow}</p>
            <h2 className="text-3xl lg:text-4xl">{storyCopy.impact.countsTitle}</h2>
            <p className="mt-4 max-w-sm text-ink-2">{storyCopy.impact.countsCaption}</p>
            {generatedAt ? <p className="spec mt-4">Read {generatedAt}</p> : null}
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
              <Count label={copy.impact.unitsSold} value={num(summary, "units_sold")} />
              <Count label={copy.impact.makersCount} value={num(summary, "maker_count")} />
              <Count label={copy.impact.communitiesCount} value={num(summary, "community_count")} />
              <Count label={copy.impact.districtsCount} value={num(summary, "district_count")} />
            </div>

            {showMoneyFlow ? (
              <SpecList
                className="mt-12"
                items={[
                  {
                    label: copy.impact.paidToMakers,
                    value: formatNpr(num(summary, "paid_to_makers_paisa") ?? 0),
                  },
                ]}
              />
            ) : (
              <div className="mt-12 border-l-2 border-rule-strong pl-6">
                <p className="spec">{storyCopy.impact.noShareTitle}</p>
                <p className="mt-2 max-w-[58ch] text-ink-2">{storyCopy.impact.noShareBody}</p>
              </div>
            )}
          </div>
        </div>
      </Section>

      {byCommunity.length ? (
        <Section tight className="pt-0">
          <Rule className="mb-12" />
          <h2 className="text-3xl lg:text-4xl">{storyCopy.impact.byCommunityTitle}</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="spec pb-4 text-left">
                {storyCopy.impact.byCommunityCaption}
              </caption>
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="spec py-3 pr-4">
                    {copy.product.community}
                  </th>
                  <th scope="col" className="spec py-3 pr-4">
                    {copy.product.district}
                  </th>
                  <th scope="col" className="spec py-3 pr-4 text-right">
                    {copy.impact.makersCount}
                  </th>
                  <th scope="col" className="spec py-3 text-right">
                    {copy.impact.unitsSold}
                  </th>
                  {showMoneyFlow ? (
                    <th scope="col" className="spec py-3 pl-4 text-right">
                      {copy.impact.paidToMakers}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {byCommunity.map((row) => (
                  <tr key={row.community_slug} className="border-b border-rule">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {row.community_name}
                    </th>
                    <td className="spec-value py-3 pr-4 text-ink-2">{row.district}</td>
                    <td className="spec-value py-3 pr-4 text-right tabular-nums">
                      {row.maker_count}
                    </td>
                    <td className="spec-value py-3 text-right tabular-nums">{row.units_sold}</td>
                    {showMoneyFlow ? (
                      <td className="spec-value py-3 pl-4 text-right tabular-nums">
                        {formatNpr(row.paid_to_maker_paisa)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6">
            <Link href="/makers" className="spec text-ink hover:text-clay">
              {copy.makers.title} →
            </Link>
          </p>
        </Section>
      ) : null}

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="text-2xl">{copy.impact.methodTitle}</h2>
            <div className="mt-5 max-w-[58ch] space-y-4 text-ink-2">
              {storyCopy.impact.methodBody.map((para) => (
                <p key={para.slice(0, 24)}>{para}</p>
              ))}
            </div>
          </div>

          {/* Publishing the limitations is the cheapest credibility available,
              and it is house style. */}
          <div className="lg:col-span-6">
            <h2 className="text-2xl">{copy.impact.limitationsTitle}</h2>
            <ul className="mt-5 max-w-[58ch] border-t border-rule">
              {storyCopy.impact.limitationsBody.map((item) => (
                <li key={item.slice(0, 24)} className="border-b border-rule py-4 text-ink-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
