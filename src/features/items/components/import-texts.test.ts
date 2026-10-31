import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/api-failure";
import type { components } from "@/api/schema";

import { importFailureText, rowErrorText } from "./import-texts";

type RowError = components["schemas"]["ItemImportRowError"];

const SILLA = { id: "i-1", name: "Silla Tiffany blanca", archived: false };
const LIVING = { id: "i-4", name: "Living blanco", archived: true };

describe("rowErrorText", () => {
  it("has one short text per code that carries nothing else", () => {
    const texts: [RowError["code"], string][] = [
      ["missing_columns", "Faltan columnas."],
      ["too_many_columns", "Sobran columnas."],
      ["name_invalid", "Nombre vacío o muy largo."],
      ["stock_invalid", "Cantidad inválida."],
      ["price_invalid", "Precio inválido: sin coma."],
      ["category_invalid", "Categoría muy larga."],
      ["code_invalid", "Código muy largo."],
      ["description_invalid", "Descripción muy larga."],
    ];
    for (const [code, text] of texts) {
      expect(rowErrorText({ code })).toBe(text);
    }
  });

  it("names the other line of a repeated name or code, or the list when there is none", () => {
    expect(rowErrorText({ code: "name_repeated", otherLine: 3 })).toBe(
      "Repetido en la línea 3.",
    );
    expect(rowErrorText({ code: "name_repeated" })).toBe(
      "Repetido en la lista.",
    );
    expect(rowErrorText({ code: "code_repeated", otherLine: 7 })).toBe(
      "Código repetido en la línea 7.",
    );
    expect(rowErrorText({ code: "code_repeated" })).toBe(
      "Código repetido en la lista.",
    );
  });

  it("says which item has the name, and if it is archived", () => {
    expect(rowErrorText({ code: "name_taken", item: SILLA })).toBe(
      "Ya existe: «Silla Tiffany blanca».",
    );
    expect(rowErrorText({ code: "name_taken", item: LIVING })).toBe(
      "Ya existe, dado de baja: «Living blanco».",
    );
    expect(rowErrorText({ code: "name_taken" })).toBe("Ya existe.");
  });

  it("says which item has the code, and if it is archived", () => {
    expect(rowErrorText({ code: "code_taken", item: SILLA })).toBe(
      "Código de «Silla Tiffany blanca».",
    );
    expect(rowErrorText({ code: "code_taken", item: LIVING })).toBe(
      "Código de «Living blanco», dado de baja.",
    );
    expect(rowErrorText({ code: "code_taken" })).toBe("Código ocupado.");
  });
});

describe("importFailureText", () => {
  const rejected = (status: number, code: string) =>
    new ApiError({ kind: "rejected", status, code });

  it("has the text of each way a list is turned down", () => {
    expect(importFailureText(rejected(400, "empty_list"))).toBe(
      "La lista está vacía.",
    );
    expect(importFailureText(rejected(400, "too_many_rows"))).toBe(
      "Más de 500 filas: partila.",
    );
    expect(importFailureText(rejected(413, "payload_too_large"))).toBe(
      "La lista es muy grande: partila.",
    );
    expect(importFailureText(rejected(422, "import_rejected"))).toBe(
      "No se cargó nada: corregí las filas marcadas.",
    );
  });

  it("falls back to the generic text of the code for the rest", () => {
    expect(importFailureText(rejected(403, "read_only"))).toBe(
      "No se guardó: tu negocio está en solo lectura. Escribinos para reactivarlo.",
    );
  });
});
