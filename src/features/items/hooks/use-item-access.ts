import { useMe } from "@/features/session";

import { itemAccessOf } from "../api/access";

export function useItemAccess() {
  return itemAccessOf(useMe(true).data);
}
