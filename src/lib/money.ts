// Money is integer paisa everywhere. It is only ever turned into a string at
// the edge of the UI, never stored or compared as a float.

export const PAISA_PER_RUPEE = 100;

/** `420000` -> `"Rs 4,200"`. Paisa are shown only when they are non-zero. */
export function formatNpr(paisa: number, opts: { withSymbol?: boolean } = {}): string {
  const { withSymbol = true } = opts;
  const rupees = paisa / PAISA_PER_RUPEE;
  const body = rupees.toLocaleString("en-NP", {
    minimumFractionDigits: paisa % PAISA_PER_RUPEE === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `Rs ${body}` : body;
}

export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

/**
 * The eSewa status API returns amounts as a JSON number or a string that may
 * carry thousands separators. Parse defensively before comparing to a stored
 * paisa value — a silent mis-parse here means shipping goods for the wrong price.
 */
export function esewaAmountToPaisa(value: unknown): number {
  const cleaned = String(value).replace(/,/g, "").trim();
  const rupees = Number(cleaned);
  if (!Number.isFinite(rupees)) {
    throw new Error(`unparseable eSewa amount: ${JSON.stringify(value)}`);
  }
  return Math.round(rupees * PAISA_PER_RUPEE);
}

/** eSewa expects rupees with two decimals, no separators. */
export function paisaToEsewaAmount(paisa: number): string {
  return (paisa / PAISA_PER_RUPEE).toFixed(2);
}
