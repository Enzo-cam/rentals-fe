import type { components } from "@/api/schema";

/**
 * Whether to show the screens that write a booking. Owner and manager manage the bookings; the crew only records the
 * delivery and the return, and a business in read-only mode lets nobody write. It is a comfort for the screen: the API
 * decides and rejects anyway (INV-FE-01).
 * @see ../rentals-be/docs/adr/0003-roles-y-permisos.md
 */
export function bookingAccessOf(me: components["schemas"]["Me"] | undefined): {
  canManage: boolean;
} {
  if (!me) return { canManage: false };
  return {
    canManage:
      !me.business.readOnly && (me.role === "owner" || me.role === "manager"),
  };
}
