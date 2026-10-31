import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "../api/keys";
import type { UpdateCustomerBody } from "../api/customer-body";
import { updateCustomer } from "../api/requests";

/**
 * `submitOnce` asks the cache and not the render: two fast submits can arrive before React re-renders. `onSaved` goes
 * with the call and not with the hook: the list is invalidated even if the sheet was closed meanwhile.
 */
export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  const mutationKey = customerKeys.update(id);
  const mutation = useMutation({
    mutationKey,
    mutationFn: (body: UpdateCustomerBody) => updateCustomer(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
  function submitOnce(body: UpdateCustomerBody, onSaved: () => void) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body, { onSuccess: onSaved });
  }
  return { ...mutation, submitOnce };
}
