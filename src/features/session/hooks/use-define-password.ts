import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { failureOf } from "@/api/api-failure";
import { ROUTES } from "@/lib/routes";

import { sessionKeys } from "../api/keys";
import { nextPathAfterSignIn } from "../api/next-path";
import { definePassword } from "../api/requests";

/**
 * A link the API consumed or rejected (`invalid_token`, `no_membership`) must leave the address bar, so the token is
 * not reused or shared by accident; with `weak_password` the link is still pending and the token stays.
 * On success `router.replace` swaps the history entry, so the back button does not return to the token.
 * `submitOnce` asks the cache and not the render: two fast clicks can arrive before React re-renders, and the
 * password would be sent twice.
 * @see docs/adr/0001-sesion-y-proxy-bff.md
 */
export function useDefinePassword() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutationKey = sessionKeys.definePassword();
  const mutation = useMutation({
    mutationKey,
    mutationFn: definePassword,
    onSuccess: (result) => router.replace(nextPathAfterSignIn(result)),
    onError: (error) => {
      const failure = failureOf(error);
      if (
        failure?.kind === "rejected" &&
        (failure.code === "invalid_token" || failure.code === "no_membership")
      ) {
        window.history.replaceState(null, "", ROUTES.definePassword);
      }
    },
  });
  function submitOnce(values: { token: string; password: string }) {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutation.mutate(values);
  }
  return { ...mutation, submitOnce };
}
