import type { paths } from "@/api/schema";
import { parsePesos, pesosTextOf } from "@/lib/format/money";
import { parseWholeNumber } from "@/lib/format/whole-number";
import { MAX_STOCK, type ItemFormValues, type ListedItem } from "../types";

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

export type UpdateItemBody =
  paths["/items/{id}"]["patch"]["requestBody"]["content"]["application/json"];

/** The form of an item to edit. The price is there only if the object carries it (the API decides who sees it). */
export function formValuesOf(item: ListedItem): ItemFormValues {
  return {
    name: item.name,
    totalStock: String(item.totalStock),
    outOfService: String(item.outOfService),
    price: "priceCents" in item ? pesosTextOf(item.priceCents) : "",
    category: item.category ?? "",
    code: item.code ?? "",
    description: item.description ?? "",
  };
}

/**
 * Only the keys that changed, compared after the same trimming and parsing as the create body, so a space at the end
 * of a text is not a change. A cleared text is `null`. `{}` means there is nothing to send.
 */
export function patchOf(
  item: ListedItem,
  values: ItemFormValues,
): UpdateItemBody {
  const next = createBodyOf(values);
  const patch: UpdateItemBody = {};
  if (next.name !== item.name) patch.name = next.name;
  if (next.totalStock !== item.totalStock) patch.totalStock = next.totalStock;
  if (next.outOfService !== item.outOfService) {
    patch.outOfService = next.outOfService;
  }
  if (
    next.priceCents !== ("priceCents" in item ? item.priceCents : undefined)
  ) {
    patch.priceCents = next.priceCents;
  }
  if (next.category !== item.category) patch.category = next.category;
  if (next.code !== item.code) patch.code = next.code;
  if (next.description !== item.description) {
    patch.description = next.description;
  }
  return patch;
}
