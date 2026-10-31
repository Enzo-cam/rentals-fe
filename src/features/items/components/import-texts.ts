import { describeError } from "@/api/failure-message";
import type { components } from "@/api/schema";

type RowError = components["schemas"]["ItemImportRowError"];

export const IMPORT_TEXTS = {
  title: "Cargar lista",
  label: "Lista de artículos",
  help: "Una línea por artículo: nombre; cantidad; precio en pesos enteros (1.500).",
  preview: "Ver vista previa",
  previewing: "Mirando la lista…",
  see: "Ver",
  line: (n: number) => `Línea ${n}`,
  changed: "Cambiaste la lista: pedí la vista previa de nuevo.",
  confirming: "Cargando…",
  back: "Ver los artículos",
  header: (line: number) => `La línea ${line} se tomó como encabezado.`,
  summary: (total: number, ok: number) =>
    `${total} ${total === 1 ? "fila" : "filas"}: ${ok} bien y ${total - ok} con errores.`,
  confirm: (n: number) => `Cargar ${n} ${n === 1 ? "artículo" : "artículos"}`,
  created: (n: number) =>
    `Cargamos ${n} ${n === 1 ? "artículo" : "artículos"}.`,
};

const BY_CODE: Record<string, string> = {
  empty_list: "La lista está vacía.",
  too_many_rows: "Más de 500 filas: partila.",
  payload_too_large: "La lista es muy grande: partila.",
  import_rejected: "No se cargó nada: corregí las filas marcadas.",
};

/** Short texts for the list (the help goes once, above the field). The ones with an item link to it from the row. */
export function rowErrorText(error: RowError): string {
  const { item, otherLine } = error;
  const archived = item?.archived ? ", dado de baja" : "";
  switch (error.code) {
    case "missing_columns":
      return "Faltan columnas.";
    case "too_many_columns":
      return "Sobran columnas.";
    case "name_invalid":
      return "Nombre vacío o muy largo.";
    case "stock_invalid":
      return "Cantidad inválida.";
    case "price_invalid":
      return "Precio inválido: sin coma.";
    case "category_invalid":
      return "Categoría muy larga.";
    case "code_invalid":
      return "Código muy largo.";
    case "description_invalid":
      return "Descripción muy larga.";
    case "name_repeated":
      return otherLine === undefined
        ? "Repetido en la lista."
        : `Repetido en la línea ${otherLine}.`;
    case "code_repeated":
      return otherLine === undefined
        ? "Código repetido en la lista."
        : `Código repetido en la línea ${otherLine}.`;
    case "name_taken":
      return item ? `Ya existe${archived}: «${item.name}».` : "Ya existe.";
    case "code_taken":
      return item ? `Código de «${item.name}»${archived}.` : "Código ocupado.";
  }
}

export function importFailureText(error: unknown): string {
  return describeError(error, BY_CODE);
}
