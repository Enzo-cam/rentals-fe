"use client";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { useItemAccess } from "../hooks/use-item-access";
import { FORM_TEXTS, ITEMS_TEXTS } from "./texts";

/**
 * The screens that write open only for who can manage, and nobody knows that until `GET /me` answered. If it did not,
 * the person sees why and can ask again instead of waiting for ever. Who cannot manage goes back to the list; the
 * redirect is part of the render, so a 403 that refreshes `/me` also takes the person out (INV-FE-01: the API decides).
 * A dead session is not an error here: the session providers are already leaving the screen.
 */
export function ManageGate({ children }: { children: ReactNode }) {
  const access = useItemAccess();
  if (access.loaded && !access.canManage) redirect(ROUTES.items);
  if (access.loaded) return children;
  if (access.error === null) return <p role="status">{FORM_TEXTS.loading}</p>;
  if (isLeavingSession(failureOf(access.error))) return null;
  return (
    <div className="flex flex-col gap-2">
      <p role="alert">{describeError(access.error)}</p>
      <Button variant="outline" onClick={access.retry}>
        {ITEMS_TEXTS.retry}
      </Button>
    </div>
  );
}
