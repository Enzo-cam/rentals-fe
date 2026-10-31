import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "../api/keys";
import type { CreateCustomerBody } from "../api/customer-body";
import { createCustomer } from "../api/requests";

/**
 * The API does not take an `Idempotency-Key` on customers, so a retried POST comes back as a 409 with the customer of
 * the first try. `submitOnce` asks the cache and not the render: two fast submits can arrive before React re-renders.
 * `onSaved` goes with the call and not with the hook: the list is invalidated even if the sheet was closed meanwhile.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const mutationKey = customerKeys.create();
  const mutation = useMutation({
    mutationKey,
    mutationFn: createCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
  function submitOnce(body: CreateCustomerBody, onSaved: () => void) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(body, { onSuccess: onSaved });
  }
  return { ...mutation, submitOnce };
}
