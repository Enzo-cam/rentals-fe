import { useMe } from "@/features/session";

import { itemAccessOf } from "../api/access";

/** `loaded` says that `GET /me` already answered: until then `canManage` is false only because nobody knows yet. */
export function useItemAccess() {
  const me = useMe(true).data;
  return { ...itemAccessOf(me), loaded: me !== undefined };
}
