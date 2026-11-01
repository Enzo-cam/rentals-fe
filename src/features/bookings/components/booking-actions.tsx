"use client";

import { useState } from "react";

import { failureOf, isLeavingSession } from "@/api/api-failure";
import { describeError } from "@/api/failure-message";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/session";

import { bookingActionsOf } from "../api/actions";
import {
  archivedItemIdsOf,
  insufficientStockOf,
  isInvalidTransition,
  isPickupInPast,
} from "../api/failures";
import { useBookingAction } from "../hooks/use-booking-action";
import type { Booking } from "../types";
import { BOOKING_ACTION_TEXTS } from "./texts";

/** Each message with its own key; the stock and archived conflicts name the items with the lines of the booking. */
function failureMessages(
  error: unknown,
  lines: Booking["lines"],
): { key: string; text: string }[] {
  const texts = BOOKING_ACTION_TEXTS;
  const nameOf = (itemId: string) =>
    lines.find((line) => line.itemId === itemId)?.itemName ?? texts.unknownItem;
  const short = insufficientStockOf(error);
  if (short) {
    return short.map((item) => ({
      key: item.itemId,
      text: texts.notEnough(
        nameOf(item.itemId),
        item.requested,
        item.available,
      ),
    }));
  }
  const archived = archivedItemIdsOf(error);
  if (archived) {
    return archived.map((itemId) => ({
      key: itemId,
      text: texts.archivedItem(nameOf(itemId)),
    }));
  }
  if (isInvalidTransition(error))
    return [{ key: "failure", text: texts.changed }];
  if (isPickupInPast(error)) {
    return [{ key: "failure", text: texts.pickupInPast }];
  }
  return [{ key: "failure", text: describeError(error) }];
}

/**
 * The buttons that change the status, by status and role (`bookingActionsOf`). The mutation lives here and not in the
 * dialog: the dialog unmounts its content on close and the key of a repeated tap would be lost. Only "Cancelar reserva"
 * asks first, because it frees the units; the others undo nothing that matters. The open dialog is the only state, and
 * it is only UI. The buttons stay disabled while the POST travels, and the dialog closes on confirm so a failure shows
 * in the screen.
 */
export function BookingActions({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const me = useMe(true);
  const act = useBookingAction(booking.id);
  const { primary, canCancel } = bookingActionsOf(booking.status, me.data);
  const texts = BOOKING_ACTION_TEXTS;
  const leaving = isLeavingSession(failureOf(act.error));

  return (
    <div className="flex flex-col gap-3">
      {primary && (
        <Button
          size="lg"
          disabled={act.isPending}
          onClick={() => act.mutate(primary)}
        >
          {texts[primary]}
        </Button>
      )}
      {canCancel && (
        <Button
          variant="outline"
          disabled={act.isPending}
          onClick={() => setOpen(true)}
        >
          {texts.cancel}
        </Button>
      )}
      {act.isError && !leaving && (
        <div role="alert" className="flex flex-col gap-1">
          {failureMessages(act.error, booking.lines).map(({ key, text }) => (
            <p key={key}>{text}</p>
          ))}
        </div>
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {texts.cancelTitle(booking.customer.name)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {texts.cancelDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{texts.keep}</AlertDialogCancel>
            <Button
              disabled={act.isPending}
              onClick={() => {
                setOpen(false);
                act.mutate("cancel");
              }}
            >
              {texts.cancel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
