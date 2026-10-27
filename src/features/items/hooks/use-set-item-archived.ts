import { useMutation, useQueryClient } from "@tanstack/react-query";

import { itemKeys } from "../api/keys";
import { setItemArchived } from "../api/requests";

/** Archiving and reactivating are the same call with the opposite flag; each screen decides where to go after it. */
export function useSetItemArchived(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: itemKeys.archive(id),
    mutationFn: (archived: boolean) => setItemArchived(id, archived),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
    },
  });
}
