"use client";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";

import { useMyBusinesses } from "../hooks/use-my-businesses";
import { useSelectBusiness } from "../hooks/use-select-business";
import { useSignOut } from "../hooks/use-sign-out";
import { SignOutButton } from "./sign-out-button";
import { PICKER_TEXTS, ROLE_LABELS } from "./texts";

/**
 * The list is shown in the order the API gives, and the role is only translated (INV-FE-01).
 * A dead session is not an error here: the session providers are already leaving, so it keeps the loading text.
 */
export function BusinessPicker() {
  const businesses = useMyBusinesses();
  const select = useSelectBusiness();
  const signOut = useSignOut();
  const failure = failureOf(businesses.error);
  const leaving = isLeavingSession(failure);
  const busy = select.isPending || select.isSuccess;

  if (businesses.data?.businesses.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">{PICKER_TEXTS.empty}</p>
        <SignOutButton signOut={signOut} />
      </div>
    );
  }
  if (businesses.data) {
    return (
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {businesses.data.businesses.map((business) => (
            <li key={business.id}>
              <Button
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => select.mutate(business.id)}
                className="h-auto w-full justify-start py-2 text-left whitespace-normal"
              >
                {business.name} · {ROLE_LABELS[business.role]}
              </Button>
            </li>
          ))}
        </ul>
        {select.isError && (
          <p role="alert" className="text-sm text-destructive">
            {describeError(select.error, {
              business_not_found: PICKER_TEXTS.businessGone,
            })}
          </p>
        )}
      </div>
    );
  }
  if (businesses.isError && !leaving) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert">{describeError(businesses.error)}</p>
        <Button variant="outline" onClick={() => businesses.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }
  return <p role="status">{PICKER_TEXTS.loading}</p>;
}
