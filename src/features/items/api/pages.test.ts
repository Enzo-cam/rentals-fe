import { describe, expect, it } from "vitest";

import { itemsOfPages } from "./pages";

function item(id: string, name = id) {
  return {
    id,
    name,
    totalStock: 1,
    outOfService: 0,
    category: null,
    code: null,
    description: null,
    archived: false,
  };
}

describe("itemsOfPages", () => {
  it("keeps the order of the pages and of the items", () => {
    const pages = [
      { items: [item("i1"), item("i2")], nextCursor: "c-2" },
      { items: [item("i3")], nextCursor: null },
    ];
    expect(itemsOfPages(pages).map((listed) => listed.id)).toEqual([
      "i1",
      "i2",
      "i3",
    ]);
  });

  it("shows an item that a later page repeats only once, at its first place", () => {
    const pages = [
      { items: [item("i1"), item("i2")], nextCursor: "c-2" },
      { items: [item("i2", "otra versión"), item("i3")], nextCursor: null },
    ];
    const listed = itemsOfPages(pages);
    expect(listed.map((one) => one.id)).toEqual(["i1", "i2", "i3"]);
    expect(listed[1].name).toBe("i2");
  });

  it("is empty with no pages or with empty pages", () => {
    expect(itemsOfPages([])).toEqual([]);
    expect(itemsOfPages([{ items: [], nextCursor: null }])).toEqual([]);
  });
});
