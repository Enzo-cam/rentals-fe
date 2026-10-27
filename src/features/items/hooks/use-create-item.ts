import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { itemKeys } from "../api/keys";
import { createItem } from "../api/requests";

/**
 * The API does not take an `Idempotency-Key` on items, so a retried POST comes back as a 409 with the item of the
 * first try. `submitOnce` asks the cache and not the render: two fast submits can arrive before React re-renders.
 */
export function useCreateItem() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = itemKeys.create();
  const mutation = useMutation({
    mutationKey,
    mutationFn: createItem,
    onSuccess: (item) => {
      queryClient.setQueryData(itemKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: itemKeys.categories() });
      router.push(ROUTES.item(item.id));
    },
  });
  function submitOnce(body: Parameters<typeof createItem>[0]) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body);
  }
  return { ...mutation, submitOnce };
}
