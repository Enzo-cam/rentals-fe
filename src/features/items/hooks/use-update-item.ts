import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { itemKeys } from "../api/keys";
import { updateItem } from "../api/requests";
import type { UpdateItemBody } from "../api/item-body";

/** `submitOnce` asks the cache and not the render: two fast submits can arrive before React re-renders. */
export function useUpdateItem(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = itemKeys.update(id);
  const mutation = useMutation({
    mutationKey,
    mutationFn: (body: UpdateItemBody) => updateItem(id, body),
    onSuccess: (item) => {
      queryClient.setQueryData(itemKeys.detail(item.id), item);
      void queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: itemKeys.categories() });
      router.push(ROUTES.item(item.id));
    },
  });
  function submitOnce(body: UpdateItemBody) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body);
  }
  return { ...mutation, submitOnce };
}
