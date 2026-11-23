"use client";

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

import { useBookingAccess } from "../hooks/use-booking-access";
import { BOOKING_FORM_TEXTS, BOOKINGS_TEXTS } from "./texts";

/**
 * The screens that write a booking open only for who can manage, and nobody knows that until `GET /me` answered. If it
 * did not, the person sees why and can ask again instead of waiting for ever. Who cannot manage (the crew, or a
 * business that is read only) goes back to the list, and what is behind the gate (the customers, the items) is never
 * asked for: the redirect is part of the render, so a 403 that refreshes `/me` also takes the person out (INV-FE-01: the
 * API decides). A dead session is not an error here: the session providers are already leaving the screen.
 * AC-11 (rentals-be#29)
 */
export function BookingGate({ children }: { children: ReactNode }) {
  const access = useBookingAccess();
  if (access.loaded && !access.canManage) redirect(ROUTES.bookings);
  if (access.loaded) return children;
  if (access.error === null) {
    return <p role="status">{BOOKING_FORM_TEXTS.loading}</p>;
  }
  if (isLeavingSession(failureOf(access.error))) return null;
  return (
    <div className="flex flex-col gap-2">
      <p role="alert">{describeError(access.error)}</p>
      <Button variant="outline" onClick={access.retry}>
        {BOOKINGS_TEXTS.retry}
      </Button>
    </div>
  );
}
