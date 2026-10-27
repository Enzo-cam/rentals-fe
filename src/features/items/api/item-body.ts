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

function fromSchema(value: number | null): number {
  if (value === null) {
    throw new Error("patchOf needs values that passed the form schema");
  }
  return value;
}

function stockOf(text: string): number {
  return text.trim() === "" ? 0 : fromSchema(parseWholeNumber(text, MAX_STOCK));
}

/**
 * Only the keys that changed since the form opened (`opened` is what it was filled with, never the latest the server
 * sent: a field the person did not touch must not overwrite what somebody else changed meanwhile). Compared after the
 * same trimming and parsing as the create body, so a space at the end of a text is not a change. An untouched price is
 * never parsed: it may carry cents, which the form cannot read. A cleared text is `null`. `{}` means nothing to send.
 */
export function patchOf(
  opened: ItemFormValues,
  values: ItemFormValues,
): UpdateItemBody {
  const patch: UpdateItemBody = {};
  const name = values.name.trim();
  if (name !== opened.name.trim()) patch.name = name;
  const totalStock = stockOf(values.totalStock);
  if (totalStock !== stockOf(opened.totalStock)) patch.totalStock = totalStock;
  const outOfService = stockOf(values.outOfService);
  if (outOfService !== stockOf(opened.outOfService)) {
    patch.outOfService = outOfService;
  }
  if (values.price.trim() !== opened.price.trim()) {
    const priceCents = fromSchema(parsePesos(values.price));
    if (priceCents !== parsePesos(opened.price)) patch.priceCents = priceCents;
  }
  const category = orNull(values.category);
  if (category !== orNull(opened.category)) patch.category = category;
  const code = orNull(values.code);
  if (code !== orNull(opened.code)) patch.code = code;
  const description = orNull(values.description);
  if (description !== orNull(opened.description)) {
    patch.description = description;
  }
  return patch;
}
