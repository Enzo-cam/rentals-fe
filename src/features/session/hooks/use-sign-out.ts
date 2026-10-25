import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { signOut } from "../api/requests";

/** `clear()` before navigating: nothing of this session stays in memory for the next user (INV-FE-04). */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      router.replace(ROUTES.signIn);
    },
  });
}
