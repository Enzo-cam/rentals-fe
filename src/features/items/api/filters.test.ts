import { describe, expect, it } from "vitest";

import { DEFAULT_ITEM_FILTERS } from "../types";
import { itemsHref, parseItemFilters } from "./filters";

describe("parseItemFilters", () => {
  it("must give the defaults for no parameters", () => {
    expect(parseItemFilters({})).toEqual(DEFAULT_ITEM_FILTERS);
  });

  it("must read q, category and status", () => {
    expect(
      parseItemFilters({ q: "silla", category: "Vajilla", status: "all" }),
    ).toEqual({ q: "silla", category: "Vajilla", status: "all" });
    expect(parseItemFilters({ status: "archived" }).status).toBe("archived");
  });

  it("must take the first value of a repeated parameter", () => {
    expect(parseItemFilters({ q: ["uno", "dos"] }).q).toBe("uno");
    expect(parseItemFilters({ q: [] }).q).toBeNull();
  });

  it("must trim, and drop what is blank", () => {
    expect(parseItemFilters({ q: "  silla  " }).q).toBe("silla");
    expect(parseItemFilters({ q: "   ", category: "" })).toEqual(
      DEFAULT_ITEM_FILTERS,
    );
  });

  it("must fall back to active for a status the API would refuse", () => {
    expect(parseItemFilters({ status: "borrados" }).status).toBe("active");
    expect(parseItemFilters({ status: "" }).status).toBe("active");
    expect(parseItemFilters({ status: "ALL" }).status).toBe("active");
  });

  it("must drop a q over 100 and a category over 60, counted in code points", () => {
    expect(parseItemFilters({ q: "a".repeat(100) }).q).toBe("a".repeat(100));
    expect(parseItemFilters({ q: "a".repeat(101) }).q).toBeNull();
    expect(parseItemFilters({ q: "😀".repeat(100) }).q).toBe("😀".repeat(100));
    expect(parseItemFilters({ category: "a".repeat(60) }).category).toBe(
      "a".repeat(60),
    );
    expect(parseItemFilters({ category: "a".repeat(61) }).category).toBeNull();
  });
});

describe("itemsHref", () => {
  it("must be the bare path for the defaults", () => {
    expect(itemsHref(DEFAULT_ITEM_FILTERS)).toBe("/articulos");
  });

  it("must carry only what is not the default", () => {
    expect(itemsHref({ ...DEFAULT_ITEM_FILTERS, q: "silla" })).toBe(
      "/articulos?q=silla",
    );
    expect(itemsHref({ ...DEFAULT_ITEM_FILTERS, status: "all" })).toBe(
      "/articulos?status=all",
    );
    expect(
      itemsHref({ q: "silla", category: "Vajilla", status: "archived" }),
    ).toBe("/articulos?q=silla&category=Vajilla&status=archived");
  });

  it("must encode what needs it and survive a round trip", () => {
    const filters = {
      q: "mesa & silla",
      category: "Año ñu",
      status: "all",
    } as const;
    const params = Object.fromEntries(
      new URL(itemsHref(filters), "http://x").searchParams,
    );
    expect(parseItemFilters(params)).toEqual(filters);
  });
});
