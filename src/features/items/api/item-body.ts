import type { paths } from "@/api/schema";

import { parsePesos } from "../../../lib/format/money";
import { parseWholeNumber } from "../../../lib/format/whole-number";
import { MAX_STOCK, type ItemFormValues } from "../types";

export type CreateItemBody =
  paths["/items"]["post"]["requestBody"]["content"]["application/json"];

function orNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The body of `POST /items` from a form that already passed `itemFormSchema`, so the numbers always parse: texts
 * trimmed, empty optionals as `null`, an empty out of service as 0. A value that does not parse is a bug, not input.
 */
export function createBodyOf(values: ItemFormValues): CreateItemBody {
  const totalStock = parseWholeNumber(values.totalStock, MAX_STOCK);
  const outOfService =
    values.outOfService.trim() === ""
      ? 0
      : parseWholeNumber(values.outOfService, MAX_STOCK);
  const priceCents = parsePesos(values.price);
  if (totalStock === null || outOfService === null || priceCents === null) {
    throw new Error("createBodyOf needs values that passed itemFormSchema");
  }
  return {
    name: values.name.trim(),
    totalStock,
    outOfService,
    priceCents,
    category: orNull(values.category),
    code: orNull(values.code),
    description: orNull(values.description),
  };
}
