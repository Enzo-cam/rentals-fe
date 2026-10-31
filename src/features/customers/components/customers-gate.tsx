"use client";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { useCustomerAccess } from "../hooks/use-customer-access";
import { CUSTOMERS_TEXTS, FORM_TEXTS } from "./texts";

/**
 * The customers open only for who can view them (owner and manager; the crew goes to the items), and nobody knows that
 * until `GET /me` answered. If it did not, the person sees why and can ask again instead of waiting for ever. The
 * redirect is part of the render, so a 403 that refreshes `/me` also takes the person out (INV-FE-01: the API decides).
 * A dead session is not an error here: the session providers are already leaving the screen.
 */
export function CustomersGate({ children }: { children: ReactNode }) {
  const access = useCustomerAccess();
  if (access.loaded && !access.canView) redirect(ROUTES.items);
  if (access.loaded) return children;
  if (access.error === null) return <p role="status">{FORM_TEXTS.loading}</p>;
  if (isLeavingSession(failureOf(access.error))) return null;
  return (
    <div className="flex flex-col gap-2">
      <p role="alert">{describeError(access.error)}</p>
      <Button variant="outline" onClick={access.retry}>
        {CUSTOMERS_TEXTS.retry}
      </Button>
    </div>
  );
}
