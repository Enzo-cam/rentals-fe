"use client";

import Link from "next/link";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { useMe } from "../hooks/use-me";
import { useSignOut } from "../hooks/use-sign-out";
import { SignOutButton } from "./sign-out-button";
import { ACCOUNT_TEXTS, ROLE_LABELS } from "./texts";

/**
 * The role is only translated, never interpreted, and `readOnly`, `status` and `expiresAt` are not shown (INV-FE-01).
 * A dead session or one without a business is not an error here: the session providers are already leaving the
 * screen, so it keeps showing the loading text.
 */
export function AccountSummary() {
  const signOut = useSignOut();
  const me = useMe(!signOut.isSuccess);
  const failure = failureOf(me.error);
  const leaving = isLeavingSession(failure);

  return (
    <div className="flex flex-col gap-4">
      {me.data ? (
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-sm text-muted-foreground">Nombre</dt>
            <dd className="break-words">{me.data.user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Negocio</dt>
            <dd className="break-words">{me.data.business.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Rol</dt>
            <dd>{ROLE_LABELS[me.data.role]}</dd>
          </div>
        </dl>
      ) : failure?.kind === "rejected" && failure.status === 404 ? (
        <div className="flex flex-col gap-2">
          <p role="alert">{ACCOUNT_TEXTS.businessGone}</p>
          <Link href={ROUTES.selectBusiness} className="underline">
            Elegir otro negocio
          </Link>
        </div>
      ) : me.isError && !leaving ? (
        <div className="flex flex-col gap-2">
          <p role="alert">{describeError(me.error)}</p>
          <Button variant="outline" onClick={() => me.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <p role="status">{ACCOUNT_TEXTS.loading}</p>
      )}
      <Link
        href={ROUTES.items}
        className={buttonVariants({ variant: "outline" })}
      >
        {ACCOUNT_TEXTS.items}
      </Link>
      <SignOutButton signOut={signOut} />
    </div>
  );
}
