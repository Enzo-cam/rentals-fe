import type { components } from "@/api/schema";

/**
 * Whether to show the buttons that write. Owner and manager manage the items and the crew only reads them; a business
 * in read-only mode lets nobody write. It is a comfort for the screen: the API decides and rejects anyway (INV-FE-01).
 * @see ../rentals-be/docs/adr/0003-roles-y-permisos.md
 */
export function itemAccessOf(me: components["schemas"]["Me"] | undefined): {
  canManage: boolean;
  readOnly: boolean;
} {
  if (!me) return { canManage: false, readOnly: false };
  const readOnly = me.business.readOnly;
  return {
    canManage: !readOnly && (me.role === "owner" || me.role === "manager"),
    readOnly,
  };
}
