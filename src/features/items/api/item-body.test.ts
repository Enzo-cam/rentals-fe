import { describe, expect, it } from "vitest";

import type { ItemFormValues, ListedItem } from "../types";
import { createBodyOf, formValuesOf, patchOf } from "./item-body";

const FILLED: ItemFormValues = {
  name: " Mesa redonda 1,50 m ",
  totalStock: "30",
  outOfService: "",
  price: "$ 12.000",
  category: " Mobiliario ",
  code: "  ",
  description: "",
};

describe("createBodyOf", () => {
  it("trims the texts, turns empty optionals into null and an empty out of service into 0", () => {
    expect(JSON.stringify(createBodyOf(FILLED))).toBe(
      '{"name":"Mesa redonda 1,50 m","totalStock":30,"outOfService":0,"priceCents":1200000,"category":"Mobiliario","code":null,"description":null}',
    );
  });

  it("reads the numbers the way the form accepts them", () => {
    expect(
      createBodyOf({
        ...FILLED,
        totalStock: "1.500",
        outOfService: "12",
        price: "0",
        code: "MR-1",
        description: "Para 8 personas",
      }),
    ).toEqual({
      name: "Mesa redonda 1,50 m",
      totalStock: 1500,
      outOfService: 12,
      priceCents: 0,
      category: "Mobiliario",
      code: "MR-1",
      description: "Para 8 personas",
    });
  });
});

const SILLA: ListedItem = {
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  name: "Silla Tiffany blanca",
  totalStock: 120,
  outOfService: 4,
  priceCents: 150000,
  category: "Mobiliario",
  code: "SIL-01",
  description: null,
  archived: false,
};

const UNTOUCHED: ItemFormValues = {
  name: "Silla Tiffany blanca",
  totalStock: "120",
  outOfService: "4",
  price: "1.500",
  category: "Mobiliario",
  code: "SIL-01",
  description: "",
};

describe("formValuesOf", () => {
  it("fills the form with the item, the price as pesosTextOf writes it", () => {
    expect(formValuesOf(SILLA)).toEqual(UNTOUCHED);
  });

  it("fills empty texts for what the item does not have, and no price for an item without it", () => {
    const withoutPrice: ListedItem = {
      id: SILLA.id,
      name: SILLA.name,
      totalStock: 120,
      outOfService: 4,
      category: null,
      code: null,
      description: null,
      archived: false,
    };
    expect(formValuesOf(withoutPrice)).toEqual({
      ...UNTOUCHED,
      price: "",
      category: "",
      code: "",
    });
  });
});

describe("patchOf", () => {
  const edit = (values: Partial<ItemFormValues>) =>
    JSON.stringify(patchOf(UNTOUCHED, { ...UNTOUCHED, ...values }));

  it("is empty when nothing changed, also when the only difference is a space around a text", () => {
    expect(patchOf(UNTOUCHED, UNTOUCHED)).toEqual({});
    expect(
      patchOf(UNTOUCHED, { ...UNTOUCHED, name: "Silla Tiffany blanca " }),
    ).toEqual({});
    expect(
      patchOf(UNTOUCHED, { ...UNTOUCHED, category: "  Mobiliario" }),
    ).toEqual({});
  });

  it("sends only the price when only the price changed", () => {
    expect(edit({ price: "1.800" })).toBe('{"priceCents":180000}');
  });

  it("sends a cleared category, code or description as null", () => {
    expect(edit({ category: "" })).toBe('{"category":null}');
    expect(edit({ code: "   " })).toBe('{"code":null}');
  });

  it("sends a description that was empty and now has text", () => {
    expect(edit({ description: " Blanca " })).toBe('{"description":"Blanca"}');
  });

  it("sends every changed key, in the order of the contract", () => {
    expect(
      edit({
        name: "Silla",
        totalStock: "1.000",
        outOfService: "",
        price: "0",
        category: "X",
        code: "",
        description: "d",
      }),
    ).toBe(
      '{"name":"Silla","totalStock":1000,"outOfService":0,"priceCents":0,"category":"X","code":null,"description":"d"}',
    );
  });

  it("reads an empty out of service as 0, so it is not a change for an item with none", () => {
    expect(
      patchOf(
        { ...UNTOUCHED, outOfService: "0" },
        { ...UNTOUCHED, outOfService: "" },
      ),
    ).toEqual({});
  });

  it("reads the same number written another way as no change", () => {
    expect(
      patchOf(
        { ...UNTOUCHED, totalStock: "1500", price: "1500" },
        { ...UNTOUCHED, totalStock: "1.500", price: "$ 1.500" },
      ),
    ).toEqual({});
  });

  it.each([
    ["an untouched price with cents", { price: "1.500,50" }, {}, {}],
    [
      "an untouched price with cents, while the stock changed",
      { price: "1.500,50" },
      { totalStock: "150" },
      { totalStock: 150 },
    ],
    [
      "a price with cents that the person replaced with whole pesos",
      { price: "1.500,50" },
      { price: "1.800" },
      { priceCents: 180000 },
    ],
  ])(
    "never sends a field equal to the one the form opened with: %s",
    (_label, opened, typed, expected) => {
      const defaults = { ...UNTOUCHED, ...opened };
      expect(patchOf(defaults, { ...defaults, ...typed })).toEqual(expected);
    },
  );
});
