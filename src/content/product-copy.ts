/**
 * PDP-only strings that `copy.ts` does not carry yet. Same register: verbs of
 * making, no verbs of helping. Merge upward into `copy.product` when the
 * Nepali translation pass happens.
 */
export const productCopy = {
  /** Origin Trace disclosure. */
  originExpand: "The full path",
  time: "Time",
  hours: (h: number) => `~${h} hrs`,

  /** Variant group legend when the variant rows carry no option name. */
  option: "Option",

  /** Food rows — the columns land with the food catalogue, the labels are ready. */
  batch: "Batch",
  expiry: "Best before",
} as const;
