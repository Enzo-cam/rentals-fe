import { ApiError, failureOf } from "@/api/api-failure";

import type { Customer } from "../types";

function isCustomer(value: unknown): value is Customer {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "whatsapp" in value &&
    typeof value.whatsapp === "string"
  );
}

/**
 * A 409 `whatsapp_taken` says which customer has the number: its body carries the customer (`CustomerConflict`), so the
 * screen can offer to edit that one. `null` when the failure is another or the body does not name one.
 */
export function takenWhatsappOf(error: unknown): Customer | null {
  const failure = failureOf(error);
  if (
    failure?.kind !== "rejected" ||
    failure.status !== 409 ||
    failure.code !== "whatsapp_taken"
  ) {
    return null;
  }
  const body = error instanceof ApiError ? error.body : undefined;
  if (typeof body !== "object" || body === null || !("customer" in body)) {
    return null;
  }
  return isCustomer(body.customer) ? body.customer : null;
}

/** The API read the WhatsApp and it has no 10 digits, or it has the 15: the number is not one that can be written to. */
export function isInvalidWhatsapp(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    failure?.kind === "rejected" &&
    failure.status === 400 &&
    failure.code === "invalid_whatsapp"
  );
}
