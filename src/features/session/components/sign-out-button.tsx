import { Button } from "@/components/ui/button";

import type { useSignOut } from "../hooks/use-sign-out";
import { ACCOUNT_TEXTS } from "./texts";

/** The mutation comes from the caller because `/cuenta` also needs to know the user signed out. */
export function SignOutButton({
  signOut,
}: {
  signOut: ReturnType<typeof useSignOut>;
}) {
  const busy = signOut.isPending || signOut.isSuccess;
  return (
    <>
      {signOut.isError && (
        <p role="alert" className="text-sm text-destructive">
          {ACCOUNT_TEXTS.signOutFailed}
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => signOut.mutate()}
      >
        {busy ? "Saliendo…" : "Salir"}
      </Button>
    </>
  );
}
