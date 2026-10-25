import { useQuery } from "@tanstack/react-query";

import { sessionKeys } from "../api/keys";
import { getMe } from "../api/requests";

/** `enabled` is turned off once the user signed out, so the cleared cache is not asked again with a dead cookie. */
export function useMe(enabled: boolean) {
  return useQuery({ queryKey: sessionKeys.me(), queryFn: getMe, enabled });
}
