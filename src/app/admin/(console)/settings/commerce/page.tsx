import { getSettingRaw } from "@/server/cms";
import { PAISA_PER_RUPEE } from "@/lib/money";
import { ActionForm } from "../../../action-form";
import { saveCommerceSettingsAction } from "../../../cms-actions";
import { Explain, Note, Panel } from "../../../ui";

export const dynamic = "force-dynamic";

const control =
  "w-full rounded-sm border border-rule-strong bg-surface px-2 py-1.5 text-sm text-ink " +
  "focus:border-ink focus:outline-none";

/** Stored as paisa, typed as rupees. The form is the only place that converts. */
function rupees(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value / PAISA_PER_RUPEE : fallback;
}

export default async function CommercePage() {
  const [shipping, cod] = await Promise.all([getSettingRaw("shipping"), getSettingRaw("cod")]);

  const districts = Array.isArray(shipping?.valley_districts)
    ? (shipping!.valley_districts as string[]).join(", ")
    : "Kathmandu, Lalitpur, Bhaktapur";

  return (
    <>
      <Explain>
        What a customer is charged for delivery, and whether they can pay on the doorstep. These
        apply to <strong>new orders only</strong> — orders already placed keep the amounts they were
        quoted.
      </Explain>

      <Note tone="warn">
        These are the only settings on this screen that change what someone pays. Read them twice
        before saving.
      </Note>

      <ActionForm
        action={saveCommerceSettingsAction}
        submitLabel="Save delivery & payment rules"
        variant="primary"
        size="md"
        className="mt-5"
      >
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <Panel title="Delivery charges">
            <div className="space-y-3 px-3 py-3">
              <div>
                <label htmlFor="f-inside" className="spec mb-1 block text-ink">
                  Inside the valley (rupees)
                </label>
                <input
                  id="f-inside"
                  name="inside_valley"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={rupees(shipping?.inside_valley_paisa, 150)}
                  className={`${control} max-w-36`}
                />
              </div>
              <div>
                <label htmlFor="f-outside" className="spec mb-1 block text-ink">
                  Everywhere else (rupees)
                </label>
                <input
                  id="f-outside"
                  name="outside_valley"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={rupees(shipping?.outside_valley_paisa, 250)}
                  className={`${control} max-w-36`}
                />
              </div>
              <div>
                <label htmlFor="f-free" className="spec mb-1 block text-ink">
                  Free delivery over (rupees)
                </label>
                <input
                  id="f-free"
                  name="free_over"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={rupees(shipping?.free_over_paisa, 5000)}
                  className={`${control} max-w-36`}
                />
                <p className="mt-1 text-xs text-ink-2">Set this to 0 to never give free delivery.</p>
              </div>
              <div>
                <label htmlFor="f-districts" className="spec mb-1 block text-ink">
                  Which districts count as the valley
                </label>
                <input id="f-districts" name="valley_districts" defaultValue={districts} className={control} />
                <p className="mt-1 text-xs text-ink-2">
                  Separated by commas. Spelling must match what customers pick at checkout.
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Cash on delivery">
            <div className="space-y-3 px-3 py-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="cod_enabled"
                  defaultChecked={cod?.enabled !== false}
                  className="mt-0.5 h-4 w-4 accent-[#b4552d]"
                />
                <span>
                  Let customers pay when the parcel arrives.
                  <span className="mt-0.5 block text-xs text-ink-2">
                    Most orders in Nepal are paid this way. Turning it off leaves eSewa as the only
                    option.
                  </span>
                </span>
              </label>

              <div>
                <label htmlFor="f-codmax" className="spec mb-1 block text-ink">
                  Largest order allowed on delivery (rupees)
                </label>
                <input
                  id="f-codmax"
                  name="cod_max"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={rupees(cod?.max_order_paisa, 15000)}
                  className={`${control} max-w-36`}
                />
                <p className="mt-1 text-xs text-ink-2">
                  Above this, the customer must pay online. It caps what a refused parcel can cost
                  you.
                </p>
              </div>

              <div>
                <label htmlFor="f-refusals" className="spec mb-1 block text-ink">
                  Refusals before a customer is blocked
                </label>
                <input
                  id="f-refusals"
                  name="cod_refusals"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={typeof cod?.max_refusals_before_block === "number" ? cod.max_refusals_before_block : 2}
                  className={`${control} max-w-24`}
                />
                <p className="mt-1 text-xs text-ink-2">
                  After this many refused parcels, that phone number has to pay online.
                </p>
              </div>

              <p className="border-t border-rule pt-3 text-xs leading-relaxed text-ink-2">
                Every cash-on-delivery order still has to be confirmed by phone before it can be
                packed. That queue is under <strong>Phone confirmations</strong>.
              </p>
            </div>
          </Panel>
        </div>
      </ActionForm>
    </>
  );
}
