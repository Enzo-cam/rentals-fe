"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { parsePesos, pesosTextOf } from "@/lib/format/money";

import {
  depositShortcutCents,
  suggestedTotalCentsOf,
} from "../api/booking-body";
import type { BookingFormValues } from "../types";
import { TextField } from "./form-field";
import { BOOKING_FORM_TEXTS, DEPOSIT_SHORTCUTS } from "./texts";

/**
 * Freight, total and deposit. The total is the suggested sum while the person has not touched it (`total` is `null`):
 * the field shows it, derived on each render from the lines and the freight, and that is what goes; once the person
 * types, it is what they typed, and what they erase stays erased (INV-FE-06: no effect copies the sum into the field).
 * The shortcuts of the deposit write the share of the total as it is shown, in whole pesos, and the person can still
 * change it. All of it is a help, the exception of INV-FE-01 that the founder decided: the balance, the stock and the
 * dates are the API's.
 * AC-1 (rentals-be#29)
 */
export function BookingMoney({
  form,
}: {
  form: UseFormReturn<BookingFormValues>;
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors, isSubmitted },
  } = form;
  const [lines, freight, total] = useWatch({
    control,
    name: ["lines", "freight", "total"],
  });
  const texts = BOOKING_FORM_TEXTS;
  const suggestedCents = suggestedTotalCentsOf({ lines, freight });
  const totalCents = total === null ? suggestedCents : parsePesos(total);

  function writeShortcut(percent: number) {
    if (!totalCents) return;
    setValue(
      "depositAmount",
      pesosTextOf(depositShortcutCents(totalCents, percent)),
      { shouldDirty: true, shouldValidate: isSubmitted },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField
        id="booking-freight"
        label={texts.freight}
        inputMode="numeric"
        error={errors.freight?.message}
        {...register("freight")}
      />
      <TextField
        id="booking-total"
        label={texts.total}
        inputMode="numeric"
        error={errors.total?.message}
        value={total ?? pesosTextOf(suggestedCents)}
        onChange={(event) =>
          setValue("total", event.target.value, {
            shouldDirty: true,
            shouldValidate: isSubmitted,
          })
        }
        note={
          <p className="text-sm text-muted-foreground">
            {texts.suggested(suggestedCents)}
          </p>
        }
      />
      <TextField
        id="booking-deposit"
        label={texts.deposit}
        inputMode="numeric"
        error={errors.depositAmount?.message}
        {...register("depositAmount")}
        note={
          <div className="flex gap-2">
            {DEPOSIT_SHORTCUTS.map((percent) => (
              <Button
                key={percent}
                type="button"
                variant="outline"
                disabled={!totalCents}
                onClick={() => writeShortcut(percent)}
              >
                {`${percent} %`}
              </Button>
            ))}
          </div>
        }
      />
      <TextField
        id="booking-deposit-date"
        label={texts.depositDate}
        type="date"
        error={errors.depositDate?.message}
        {...register("depositDate")}
      />
    </div>
  );
}
