import type { paths } from "@/api/schema";

import type { Customer, CustomerFormValues } from "../types";

export type CreateCustomerBody =
  paths["/customers"]["post"]["requestBody"]["content"]["application/json"];

export type UpdateCustomerBody =
  paths["/customers/{id}"]["patch"]["requestBody"]["content"]["application/json"];

/** The body of `POST /customers` from a form that already passed `customerFormSchema`: both texts, trimmed. */
export function createBodyOf(values: CustomerFormValues): CreateCustomerBody {
  return { name: values.name.trim(), whatsapp: values.whatsapp.trim() };
}

/** The form of a customer to edit. */
export function formValuesOf(customer: Customer): CustomerFormValues {
  return { name: customer.name, whatsapp: customer.whatsapp };
}

/**
 * Only the keys that changed since the form opened (`opened` is what it was filled with), compared after the same
 * trimming as the create body, so a space at the end of a text is not a change. `{}` means nothing to send.
 */
export function patchOf(
  opened: CustomerFormValues,
  values: CustomerFormValues,
): UpdateCustomerBody {
  const patch: UpdateCustomerBody = {};
  const name = values.name.trim();
  if (name !== opened.name.trim()) patch.name = name;
  const whatsapp = values.whatsapp.trim();
  if (whatsapp !== opened.whatsapp.trim()) patch.whatsapp = whatsapp;
  return patch;
}
