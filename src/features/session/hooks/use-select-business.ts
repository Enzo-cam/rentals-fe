import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { failureOf } from "@/api/api-failure";
import { AFTER_SIGN_IN_PATH } from "@/lib/routes";

import { sessionKeys } from "../api/keys";
import { selectBusiness } from "../api/requests";

/**
 * `clear()` before navigating: nothing of the previous business stays in memory (INV-FE-04).
 * A 404 means the membership is gone, so the list is asked again.
 */
export function useSelectBusiness() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: selectBusiness,
    onSuccess: () => {
      queryClient.clear();
      router.replace(AFTER_SIGN_IN_PATH);
    },
    onError: (error) => {
      const failure = failureOf(error);
      if (failure?.kind === "rejected" && failure.status === 404) {
        void queryClient.invalidateQueries({
          queryKey: sessionKeys.businesses(),
        });
      }
    },
  });
}
