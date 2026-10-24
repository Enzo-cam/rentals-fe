import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { sessionKeys } from "../api/keys";
import { nextPathAfterSignIn } from "../api/next-path";
import { signIn } from "../api/requests";

/**
 * `clear()` before navigating: no `/me` of a previous session survives, and the mutation variables, which hold the
 * password, leave memory (INV-FE-04). `submitOnce` asks the cache and not the render: two fast submits can arrive
 * before React re-renders.
 */
export function useSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = sessionKeys.signIn();
  const mutation = useMutation({
    mutationKey,
    mutationFn: signIn,
    onSuccess: (result) => {
      queryClient.clear();
      router.replace(nextPathAfterSignIn(result));
    },
  });
  function submitOnce(values: Parameters<typeof signIn>[0]) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(values);
  }
  return { ...mutation, submitOnce };
}
