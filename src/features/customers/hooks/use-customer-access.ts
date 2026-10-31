import { useMe } from "@/features/session";

import { customerAccessOf } from "../api/access";

/**
 * `loaded` says that `GET /me` already answered: until then `canView` is false only because nobody knows yet. If it
 * never answers, `error` is why and `retry` asks again.
 */
export function useCustomerAccess() {
  const me = useMe(true);
  return {
    ...customerAccessOf(me.data),
    loaded: me.data !== undefined,
    error: me.data === undefined ? me.error : null,
    retry: () => me.refetch(),
  };
}
