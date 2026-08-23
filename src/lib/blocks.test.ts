import { describe, expect, it } from "vitest";
import {
  BLOCK_SPECS,
  BLOCK_TYPES,
  blockSummary,
  cta,
  ids,
  items,
  parseBlockData,
  s,
} from "./blocks";

/**
 * `parseBlockData` is the contract between the console's form and what the
 * storefront renders. It is the one piece of the CMS with real branching, and
 * every way it can go wrong ends the same way: a section on the live site that
 * silently renders blank or throws.
 */

function form(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);
  return fd;
}

describe("parseBlockData", () => {
  it("keeps every field the spec declares, even when the form omits it", () => {
    for (const type of BLOCK_TYPES) {
      const parsed = parseBlockData(type, new FormData());
      for (const key of Object.keys(BLOCK_SPECS[type].defaults)) {
        expect(parsed, `${type}.${key}`).toHaveProperty(key);
      }
    }
  });

  it("trims text and never returns undefined for a missing field", () => {
    const parsed = parseBlockData("statement", form([["title", "  Bought outright  "]]));
    expect(parsed.title).toBe("Bought outright");
    expect(parsed.eyebrow).toBe("");
    expect(parsed.body).toBe("");
  });

  it("clamps numbers into the range the spec allows", () => {
    expect(parseBlockData("journal_rail", form([["limit", "99"]])).limit).toBe(6);
    expect(parseBlockData("journal_rail", form([["limit", "0"]])).limit).toBe(1);
    expect(parseBlockData("journal_rail", form([["limit", "3"]])).limit).toBe(3);
  });

  it("falls back to the spec's default rather than storing a number a reader cannot use", () => {
    // An empty or nonsense box must not become NaN: NaN survives the round trip
    // through jsonb as null and the rail then renders nothing at all. The
    // fallback is the shipped default, not the minimum — a typo should leave
    // the section looking the way it did, not shrink it to one item.
    for (const bad of ["not a number", "", "  "]) {
      const parsed = parseBlockData("journal_rail", form([["limit", bad]]));
      expect(parsed.limit, bad).toBe(BLOCK_SPECS.journal_rail.defaults.limit);
      expect(Number.isFinite(parsed.limit as number), bad).toBe(true);
    }
  });

  it("rejects a select value that is not one of the offered options", () => {
    expect(parseBlockData("product_rail", form([["source", "newest"]])).source).toBe("newest");
    expect(parseBlockData("product_rail", form([["source", "manual"]])).source).toBe("manual");
    expect(parseBlockData("product_rail", form([["source", "'; drop table"]])).source).toBe("newest");
  });

  it("keeps hand-picked references in the order they were submitted", () => {
    const parsed = parseBlockData(
      "product_rail",
      form([
        ["product_ids", "c"],
        ["product_ids", "a"],
        ["product_ids", "b"],
      ])
    );
    expect(parsed.product_ids).toEqual(["c", "a", "b"]);
  });

  it("drops blank references rather than storing empty ids", () => {
    const parsed = parseBlockData(
      "category_grid",
      form([
        ["category_ids", "one"],
        ["category_ids", "   "],
        ["category_ids", "two"],
      ])
    );
    expect(parsed.category_ids).toEqual(["one", "two"]);
  });

  it("turns an empty picker into null, not an empty string", () => {
    // "" would reach Postgres as a uuid cast and raise 22P02 rather than
    // meaning "choose automatically".
    const parsed = parseBlockData("collection_feature", form([["collection_id", ""]]));
    expect(parsed.collection_id).toBeNull();
  });

  it("pairs a button's label with its address", () => {
    const parsed = parseBlockData(
      "hero",
      form([
        ["primary_cta.label", "Browse the shop"],
        ["primary_cta.href", "/shop"],
      ])
    );
    expect(parsed.primary_cta).toEqual({ label: "Browse the shop", href: "/shop" });
  });

  it("keeps repeated rows aligned and drops the ones left entirely blank", () => {
    const parsed = parseBlockData(
      "value_props",
      form([
        ["items.title", "Bought outright"],
        ["items.body", "We pay before anything is listed."],
        ["items.title", ""],
        ["items.body", ""],
        ["items.title", "Named on the label"],
        ["items.body", "Where it came from, on every product."],
      ])
    );
    expect(parsed.items).toEqual([
      { title: "Bought outright", body: "We pay before anything is listed." },
      { title: "Named on the label", body: "Where it came from, on every product." },
    ]);
  });
});

describe("payload accessors", () => {
  it("survive a payload that is missing, wrongly typed or half-filled", () => {
    const junk = { title: 42, product_ids: "not an array", cta: { label: "Go" }, items: [null, 7] };
    expect(s(junk, "title")).toBe("");
    expect(s(junk, "absent")).toBe("");
    expect(ids(junk, "product_ids")).toEqual([]);
    expect(cta(junk, "cta")).toBeNull();
    expect(items(junk, "items")).toEqual([]);
  });

  it("treats a button with only half of it filled in as no button", () => {
    expect(cta({ c: { label: "Go", href: "" } }, "c")).toBeNull();
    expect(cta({ c: { label: "", href: "/shop" } }, "c")).toBeNull();
    expect(cta({ c: { label: " Go ", href: " /shop " } }, "c")).toEqual({ label: "Go", href: "/shop" });
  });
});

describe("blockSummary", () => {
  it("names every block type without throwing on an empty payload", () => {
    for (const type of BLOCK_TYPES) {
      expect(blockSummary(type, {}), type).toBeTruthy();
    }
  });

  it("prefers what the operator wrote over the type name", () => {
    expect(blockSummary("hero", { title: "Objects with origins" })).toBe("Objects with origins");
    expect(blockSummary("hero", { eyebrow: "Curated in Nepal" })).toBe("Curated in Nepal");
    expect(blockSummary("hero", {})).toBe("Hero");
  });
});
