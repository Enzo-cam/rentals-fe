import { z } from "zod";

import type { components } from "@/api/schema";

export type Customer = components["schemas"]["Customer"];

/** What the list asks the API for: `q` only when it is not `null`. */
export type CustomerFilters = {
  q: string | null;
};

/** What the sheet over the list is showing: nothing, a new customer, or the customer being edited. */
export type SheetTarget =
  { mode: "new" } | { mode: "edit"; customer: Customer } | null;

function fitsIn(max: number) {
  return (text: string) => Array.from(text.trim()).length <= max;
}

/**
 * Only the shape, with the limits of the contract and the lengths in code points over the trimmed text, as the API
 * counts them. Whether the WhatsApp is a number that works, or one that another customer already has, is the API's to
 * decide (INV-FE-01).
 */
export const customerFormSchema = z.object({
  name: z
    .string()
    .refine((text) => text.trim() !== "", "Escribí el nombre.")
    .refine(fitsIn(120), "El nombre puede tener hasta 120 caracteres."),
  whatsapp: z
    .string()
    .refine((text) => text.trim() !== "", "Escribí el WhatsApp.")
    .refine(fitsIn(40), "El WhatsApp puede tener hasta 40 caracteres."),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  name: "",
  whatsapp: "",
};
