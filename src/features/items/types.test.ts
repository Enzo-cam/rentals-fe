import { describe, expect, it } from "vitest";

import {
  editFormSchemaOf,
  importFormSchema,
  itemFormSchema,
  type ItemFormValues,
} from "./types";

const VALID: ItemFormValues = {
  name: "Mesa redonda",
  totalStock: "30",
  outOfService: "",
  price: "$ 12.000",
  category: "",
  code: "",
  description: "",
};

function messagesOf(values: Partial<ItemFormValues>) {
  const result = itemFormSchema.safeParse({ ...VALID, ...values });
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path[0], issue.message]),
  );
}

describe("itemFormSchema", () => {
  it("accepts a form with only the required fields", () => {
    expect(itemFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("asks for the name, and not more than 120 characters of the trimmed text", () => {
    expect(messagesOf({ name: "   " })).toEqual({ name: "Escribí el nombre." });
    expect(messagesOf({ name: "a".repeat(120) })).toEqual({});
    expect(messagesOf({ name: ` ${"a".repeat(120)} ` })).toEqual({});
    expect(messagesOf({ name: "a".repeat(121) })).toEqual({
      name: "El nombre puede tener hasta 120 caracteres.",
    });
  });

  it("counts the name in code points, not in UTF-16 units", () => {
    expect(messagesOf({ name: "😀".repeat(120) })).toEqual({});
    expect(messagesOf({ name: "😀".repeat(121) })).toEqual({
      name: "El nombre puede tener hasta 120 caracteres.",
    });
  });

  it("accepts a stock of 0 to 100.000, with or without the thousands dot", () => {
    for (const totalStock of ["0", "1500", "1.500", "100.000", " 30 "]) {
      expect(messagesOf({ totalStock })).toEqual({});
    }
    const wrong = "Escribí un número entero de 0 a 100.000.";
    for (const totalStock of ["", "1,5", "100.001", "-1", "1.5", "abc"]) {
      expect(messagesOf({ totalStock })).toEqual({ totalStock: wrong });
    }
  });

  it("leaves out of service empty, and checks its shape when it has text", () => {
    expect(messagesOf({ outOfService: "" })).toEqual({});
    expect(messagesOf({ outOfService: "12" })).toEqual({});
    expect(messagesOf({ outOfService: "1,5" })).toEqual({
      outOfService: "Escribí un número entero de 0 a 100.000.",
    });
  });

  it("does not compare out of service with the stock: that is the API's (INV-FE-01)", () => {
    expect(messagesOf({ totalStock: "10", outOfService: "12" })).toEqual({});
  });

  it("accepts whole pesos up to 100.000.000, and rejects commas and more", () => {
    for (const price of [
      "0",
      "1500",
      "1.500",
      "$ 1.500",
      "$1.500",
      "100.000.000",
    ]) {
      expect(messagesOf({ price })).toEqual({});
    }
    const wrong =
      "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.";
    for (const price of ["", "1500,50", "100.000.001", "abc"]) {
      expect(messagesOf({ price })).toEqual({ price: wrong });
    }
  });

  it("limits category, code and description", () => {
    expect(
      messagesOf({
        category: "a".repeat(61),
        code: "a".repeat(41),
        description: "a".repeat(501),
      }),
    ).toEqual({
      category: "La categoría puede tener hasta 60 caracteres.",
      code: "El código puede tener hasta 40 caracteres.",
      description: "La descripción puede tener hasta 500 caracteres.",
    });
    expect(
      messagesOf({
        category: "a".repeat(60),
        code: "a".repeat(40),
        description: "a".repeat(500),
      }),
    ).toEqual({});
  });
});

describe("editFormSchemaOf", () => {
  const OPENED: ItemFormValues = { ...VALID, price: "1.500,50" };
  const wrong =
    "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.";
  const priceMessage = (opened: ItemFormValues, price: string) => {
    const result = editFormSchemaOf(opened).safeParse({ ...opened, price });
    return result.success ? undefined : result.error.issues[0]?.message;
  };

  it("lets the price the form opened with go through, even with cents", () => {
    expect(priceMessage(OPENED, "1.500,50")).toBeUndefined();
    expect(priceMessage(OPENED, " 1.500,50 ")).toBeUndefined();
  });

  it("checks the price as soon as it is not the one the form opened with", () => {
    expect(priceMessage(OPENED, "1.800")).toBeUndefined();
    expect(priceMessage(OPENED, "1.500,51")).toBe(wrong);
    expect(priceMessage(OPENED, "")).toBe(wrong);
  });

  it("keeps checking every other field", () => {
    const result = editFormSchemaOf(OPENED).safeParse({ ...OPENED, name: "" });
    expect(result.success).toBe(false);
  });
});

describe("importFormSchema", () => {
  it("asks only for a list that is not empty, and does not touch it", () => {
    expect(importFormSchema.safeParse({ text: " \n " }).success).toBe(false);
    const text = "Mesa;1,5;abc\n\n";
    expect(importFormSchema.parse({ text }).text).toBe(text);
  });
});
