import type { components } from "@/api/schema";

/**
 * Whether to show the customers and the buttons that write. Owner and manager manage the customers and the crew does
 * not even read them; a business in read-only mode lets them read but nobody write. It is a comfort for the screen: the
 * API decides and rejects anyway (INV-FE-01).
 * @see ../rentals-be/docs/adr/0003-roles-y-permisos.md
 */
export function customerAccessOf(me: components["schemas"]["Me"] | undefined): {
  canView: boolean;
  canManage: boolean;
  readOnly: boolean;
} {
  if (!me) return { canView: false, canManage: false, readOnly: false };
  const canView = me.role === "owner" || me.role === "manager";
  const readOnly = me.business.readOnly;
  return { canView, canManage: canView && !readOnly, readOnly };
}
