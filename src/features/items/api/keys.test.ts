import { describe, expect, it } from "vitest";

import { DEFAULT_ITEM_FILTERS } from "../types";
import { itemKeys } from "./keys";

describe("itemKeys", () => {
  it("lists with different filters have different keys", () => {
    const active = itemKeys.list(DEFAULT_ITEM_FILTERS);
    const archived = itemKeys.list({
      ...DEFAULT_ITEM_FILTERS,
      status: "archived",
    });
    const searched = itemKeys.list({ ...DEFAULT_ITEM_FILTERS, q: "silla" });
    expect(active).not.toEqual(archived);
    expect(active).not.toEqual(searched);
    expect(archived).not.toEqual(searched);
  });

  it("lists with the same filters share the key", () => {
    expect(itemKeys.list({ ...DEFAULT_ITEM_FILTERS })).toEqual(
      itemKeys.list(DEFAULT_ITEM_FILTERS),
    );
  });

  it("every key starts with itemKeys.all, and a list with lists()", () => {
    const keys = [
      itemKeys.lists(),
      itemKeys.list(DEFAULT_ITEM_FILTERS),
      itemKeys.details(),
      itemKeys.detail("abc"),
      itemKeys.categories(),
    ];
    for (const key of keys) {
      expect(key.slice(0, itemKeys.all.length)).toEqual([...itemKeys.all]);
    }
    expect(
      itemKeys.list(DEFAULT_ITEM_FILTERS).slice(0, itemKeys.lists().length),
    ).toEqual([...itemKeys.lists()]);
  });

  it("a detail never matches the lists()", () => {
    expect(
      itemKeys.detail("abc").slice(0, itemKeys.lists().length),
    ).not.toEqual([...itemKeys.lists()]);
  });
});
