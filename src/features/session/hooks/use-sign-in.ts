import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signIn } from "../api/requests";
import { nextPathAfterSignIn } from "../api/next-path";

export function useSignIn() {
  const router = useRouter();
  return useMutation({
    mutationFn: signIn,
    onSuccess: (result) => router.replace(nextPathAfterSignIn(result)),
  });
}
