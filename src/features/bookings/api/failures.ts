import { ApiError, failureOf } from "@/api/api-failure";
import type { components } from "@/api/schema";

/**
 * The booking is not there for this business: a 404 `booking_not_found`, or a 400 `invalid_request` when the id in the
 * URL is not even a UUID. `business_not_found` is not this: it is the whole business that is gone.
 */
export function isBookingMissing(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    failure?.kind === "rejected" &&
    ((failure.status === 404 && failure.code === "booking_not_found") ||
      (failure.status === 400 && failure.code === "invalid_request"))
  );
}

/** The body of a rejection with this status and code, or `null` when the failure is another or has no JSON object. */
function rejectedBodyOf(
  error: unknown,
  status: number,
  code: string,
): object | null {
  const failure = failureOf(error);
  if (
    failure?.kind !== "rejected" ||
    failure.status !== status ||
    failure.code !== code
  ) {
    return null;
  }
  const body = error instanceof ApiError ? error.body : undefined;
  return typeof body === "object" && body !== null ? body : null;
}

/** The status of the booking no longer allows the action: it changed while the screen was open. */
export function isInvalidTransition(error: unknown): boolean {
  return rejectedBodyOf(error, 409, "invalid_transition") !== null;
}

/** An expired hold whose pickup is already past cannot be confirmed: the dates have to change first. */
export function isPickupInPast(error: unknown): boolean {
  return rejectedBodyOf(error, 400, "pickup_in_past") !== null;
}

type ShortItem = components["schemas"]["InsufficientStock"]["items"][number];

function isShortItem(value: unknown): value is ShortItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "itemId" in value &&
    typeof value.itemId === "string" &&
    "requested" in value &&
    typeof value.requested === "number" &&
    "available" in value &&
    typeof value.available === "number"
  );
}

/** A 409 `insufficient_stock` says, for each item short, what the line asks and what is free; `null` if the body differs. */
export function insufficientStockOf(error: unknown): ShortItem[] | null {
  const body = rejectedBodyOf(error, 409, "insufficient_stock");
  if (!body || !("items" in body) || !Array.isArray(body.items)) return null;
  return body.items.every(isShortItem) ? body.items : null;
}

/** A 409 `item_archived` names the archived items the booking would take again; `null` if the body differs. */
export function archivedItemIdsOf(error: unknown): string[] | null {
  const body = rejectedBodyOf(error, 409, "item_archived");
  if (!body || !("itemIds" in body) || !Array.isArray(body.itemIds)) {
    return null;
  }
  return body.itemIds.every((id) => typeof id === "string")
    ? body.itemIds
    : null;
}
