import { describe, expect, it } from "vitest";

import type { ItemFormValues } from "../types";
import { createBodyOf } from "./item-body";

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
