import { describe, expect, it } from "vitest";

import { entriesOfPages } from "./pages";

function entry(id: string, name = id) {
  return { id, name };
}

const idOf = (one: { id: string }) => one.id;

describe("entriesOfPages", () => {
  it("keeps the order of the pages and of the entries", () => {
    const pages = [
      { items: [entry("i1"), entry("i2")], nextCursor: "c-2" },
      { items: [entry("i3")], nextCursor: null },
    ];
    expect(entriesOfPages(pages, idOf).map(idOf)).toEqual(["i1", "i2", "i3"]);
  });

  it("shows an entry that a later page repeats only once, at its first place", () => {
    const pages = [
      { items: [entry("i1"), entry("i2")], nextCursor: "c-2" },
      { items: [entry("i2", "otra versión"), entry("i3")], nextCursor: null },
    ];
    const listed = entriesOfPages(pages, idOf);
    expect(listed.map(idOf)).toEqual(["i1", "i2", "i3"]);
    expect(listed[1].name).toBe("i2");
  });

  it("is empty with no pages or with empty pages", () => {
    expect(entriesOfPages([], idOf)).toEqual([]);
    expect(entriesOfPages([{ items: [] }], idOf)).toEqual([]);
  });
});
