import { ApiError, failureOf } from "../../../api/api-failure";

/**
 * The item is not there for this business: a 404 `item_not_found`, or a 400 `invalid_request` when the id in the URL
 * is not even a UUID. `business_not_found` is not this: it is the whole business that is gone.
 */
export function isItemMissing(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    failure?.kind === "rejected" &&
    ((failure.status === 404 && failure.code === "item_not_found") ||
      (failure.status === 400 && failure.code === "invalid_request"))
  );
}

type TakenItem = { id: string; name: string; archived: boolean };

function isTakenItem(value: unknown): value is TakenItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "archived" in value &&
    typeof value.archived === "boolean"
  );
}

/**
 * A 409 says which item holds the name or the code: its body carries the item (`ItemConflict`), so the screen can
 * link to it. `null` when the body does not name one.
 */
export function takenItemOf(
  error: unknown,
): { field: "name" | "code"; item: TakenItem } | null {
  const failure = failureOf(error);
  if (failure?.kind !== "rejected" || failure.status !== 409) return null;
  const body = error instanceof ApiError ? error.body : undefined;
  if (typeof body !== "object" || body === null || !("item" in body)) {
    return null;
  }
  if (!isTakenItem(body.item)) return null;
  if (failure.code === "item_name_taken") {
    return { field: "name", item: body.item };
  }
  if (failure.code === "item_code_taken") {
    return { field: "code", item: body.item };
  }
  return null;
}

export function isOutOfServiceExceeded(error: unknown): boolean {
  const failure = failureOf(error);
  return (
    failure?.kind === "rejected" &&
    failure.status === 400 &&
    failure.code === "out_of_service_exceeds_stock"
  );
}
