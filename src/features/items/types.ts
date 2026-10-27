import { z } from "zod";

import type { components, paths } from "@/api/schema";
import { parsePesos } from "@/lib/format/money";
import { parseWholeNumber } from "@/lib/format/whole-number";

type ItemsQuery = NonNullable<paths["/items"]["get"]["parameters"]["query"]>;

export type ItemStatusFilter = NonNullable<ItemsQuery["status"]>;

/** What the list asks the API for: the status always, `category` and `q` only when they are not `null`. */
export type ItemFilters = {
  status: ItemStatusFilter;
  category: string | null;
  q: string | null;
};

export const DEFAULT_ITEM_FILTERS: ItemFilters = {
  status: "active",
  category: null,
  q: null,
};

/** The API sends `priceCents` only to the roles that can view prices, so a page and its items come in two shapes. */
export type ItemPage =
  | components["schemas"]["ItemPageWithPrices"]
  | components["schemas"]["ItemPage"];

export type ListedItem =
  components["schemas"]["ItemWithPrice"] | components["schemas"]["Item"];

export const MAX_STOCK = 100_000;
const STOCK_MESSAGE = "Escribí un número entero de 0 a 100.000.";
const PRICE_MESSAGE =
  "Escribí el precio en pesos, sin centavos: 1500, 1.500 o $ 1.500.";

function fitsIn(max: number) {
  return (text: string) => Array.from(text.trim()).length <= max;
}

/**
 * Only the shape, with every field as the text the person typed: the limits are the ones of the contract, and
 * whether the out of service units fit in the stock is the API's to decide (INV-FE-01). Lengths are in code points,
 * as the API counts them, over the trimmed text. An empty out of service means 0.
 */
export const itemFormSchema = z.object({
  name: z
    .string()
    .refine((text) => text.trim() !== "", "Escribí el nombre.")
    .refine(fitsIn(120), "El nombre puede tener hasta 120 caracteres."),
  totalStock: z
    .string()
    .refine(
      (text) => parseWholeNumber(text, MAX_STOCK) !== null,
      STOCK_MESSAGE,
    ),
  outOfService: z
    .string()
    .refine(
      (text) =>
        text.trim() === "" || parseWholeNumber(text, MAX_STOCK) !== null,
      STOCK_MESSAGE,
    ),
  price: z.string().refine((text) => parsePesos(text) !== null, PRICE_MESSAGE),
  category: z
    .string()
    .refine(fitsIn(60), "La categoría puede tener hasta 60 caracteres."),
  code: z
    .string()
    .refine(fitsIn(40), "El código puede tener hasta 40 caracteres."),
  description: z
    .string()
    .refine(fitsIn(500), "La descripción puede tener hasta 500 caracteres."),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

/**
 * The schema of the edit form: the same, except that the price is only checked if it is not the one the form opened
 * with. An item can carry cents (only through the API), which the form cannot write back, and whoever does not touch
 * the price must still be able to save the rest.
 */
export function editFormSchemaOf(opened: ItemFormValues) {
  return itemFormSchema.extend({
    price: z
      .string()
      .refine(
        (text) =>
          text.trim() === opened.price.trim() || parsePesos(text) !== null,
        PRICE_MESSAGE,
      ),
  });
}

export const EMPTY_ITEM_FORM: ItemFormValues = {
  name: "",
  totalStock: "",
  outOfService: "",
  price: "",
  category: "",
  code: "",
  description: "",
};
