import { useMe } from "@/features/session";

import { itemAccessOf } from "../api/access";

/**
 * `loaded` says that `GET /me` already answered: until then `canManage` is false only because nobody knows yet. If it
 * never answers, `error` is why and `retry` asks again.
 */
export function useItemAccess() {
  const me = useMe(true);
  return {
    ...itemAccessOf(me.data),
    loaded: me.data !== undefined,
    error: me.data === undefined ? me.error : null,
    retry: () => me.refetch(),
  };
}
