import type { components } from "@/api/schema";

import type { BookingStatus } from "../types";

export type BookingAction = "confirm" | "deliver" | "return" | "cancel";

/**
 * Which buttons to show for a status. Owner and manager manage the bookings (confirm, cancel); the crew also records
 * the delivery and the return; a business in read-only mode lets nobody write. An expired hold still offers both: the
 * API checks the stock again on confirm. It is a comfort for the screen: the API decides which transitions are valid
 * and who may make them, and rejects the rest anyway (INV-FE-01).
 * @see ../rentals-be/docs/adr/0003-roles-y-permisos.md
 */
export function bookingActionsOf(
  status: BookingStatus,
  me: components["schemas"]["Me"] | undefined,
): { primary: Exclude<BookingAction, "cancel"> | null; canCancel: boolean } {
  const none = { primary: null, canCancel: false };
  if (!me || me.business.readOnly) return none;
  const canManage = me.role === "owner" || me.role === "manager";
  const canRecord = canManage || me.role === "crew";
  switch (status) {
    case "hold":
      return { primary: canManage ? "confirm" : null, canCancel: canManage };
    case "confirmed":
      return { primary: canRecord ? "deliver" : null, canCancel: canManage };
    case "delivered":
      return { primary: canRecord ? "return" : null, canCancel: false };
    case "returned":
    case "cancelled":
      return none;
  }
}
