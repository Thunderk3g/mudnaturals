import { copy } from "@/content/copy";

/**
 * Strings the shop surfaces need that `copy.ts` does not carry. Same register:
 * verbs of making, specimen-label voice, nothing that helps or uplifts.
 */
export const shopCopy = {
  intro:
    "Every object in the store, recorded with the community it came from, the district it was made in, the material it was worked from and — where one is named — the maker.",

  // --- filtering ------------------------------------------------------------
  refine: "Refine",
  filtersWithCount: (n: number) => (n > 0 ? `${copy.shop.filters} (${n})` : copy.shop.filters),
  removeFilter: (label: string) => `Remove filter: ${label}`,
  appliedFilters: "Applied",
  anyCategory: "All categories",
  anyPrice: "Any price",
  priceUnder: (max: string) => `Under ${max}`,
  priceBetween: (min: string, max: string) => `${min} – ${max}`,
  priceOver: (min: string) => `${min} and above`,

  // --- view / sort ----------------------------------------------------------
  view: "View",
  sortOptions: [
    { value: "newest", label: copy.shop.sortNewest },
    { value: "price-asc", label: copy.shop.sortPriceAsc },
    { value: "price-desc", label: copy.shop.sortPriceDesc },
    { value: "name", label: copy.shop.sortName },
  ] as { value: string; label: string }[],
  apply: "Apply",

  // --- search ---------------------------------------------------------------
  searchTitle: "Search",
  searchSubmit: "Search",
  searchPrompt: "Look up an object, a maker, a material or a district.",
  searchResultsFor: (q: string) => `Results for “${q}”`,
  searchMakersTitle: "Makers",
  searchMaterialsTitle: "Materials",
  searchBrowseTitle: "Browse by category",
  searchEverythingTitle: "Everything in the shop",
  searchEverythingBody: "The whole catalogue, newest first.",
  objectCount: (n: number) => (n === 1 ? "1 object" : `${n} objects`),

  // --- loading --------------------------------------------------------------
  loading: "Loading the shop",
} as const;
