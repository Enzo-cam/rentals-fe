"use client";

import {
  useWatch,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { parseWholeNumber } from "@/lib/format/whole-number";

import type { FormFailure } from "../api/failures";
import { MAX_QUANTITY, type BookingFormValues } from "../types";
import { ErrorText, TextField } from "./form-field";
import { BOOKING_FORM_FAILURES, BOOKING_FORM_TEXTS } from "./texts";

/** What the API said about this line: the units that are short, or the item that was taken down. */
function lineFailureOf(failure: FormFailure | null, itemId: string) {
  if (failure?.kind === "short") {
    const item = failure.items.find((short) => short.itemId === itemId);
    return item
      ? BOOKING_FORM_FAILURES.notEnough(item.requested, item.available)
      : null;
  }
  if (failure?.kind === "archived" && failure.itemIds.includes(itemId)) {
    return BOOKING_FORM_FAILURES.archived;
  }
  return null;
}

/**
 * The lines of the booking: each one with its quantity and its price as typed, and under it the units free for the
 * period, in red when the quantity is more than that. It is only a help (INV-FE-01): `free` is what `GET /availability`
 * said for these dates, a line that was not asked for shows nothing, and the API checks the stock when it saves. The
 * quantity is read from the form while it is typed, and a text that does not read yet is never red. What the API said
 * against a line goes under it (AC-6, AC-7). In the edit of a confirmed booking the price of a line that was there is
 * read only (`lockedPriceIds`): it was fixed when the booking was confirmed, and the API refuses to change it.
 * AC-1, AC-4, AC-18 (rentals-be#29)
 */
export function BookingLines({
  form,
  lines,
  free,
  lockedPriceIds,
  failure,
  onAdd,
}: {
  form: UseFormReturn<BookingFormValues>;
  lines: UseFieldArrayReturn<BookingFormValues, "lines">;
  free: Map<string, number>;
  lockedPriceIds: ReadonlySet<string>;
  failure: FormFailure | null;
  onAdd: () => void;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const typed = useWatch({ control, name: "lines" });
  const texts = BOOKING_FORM_TEXTS;
  const listError = errors.lines?.root?.message ?? errors.lines?.message;

  return (
    <section
      aria-labelledby="booking-lines-title"
      className="flex flex-col gap-3"
    >
      <h2 id="booking-lines-title" className="text-lg font-medium">
        {texts.items}
      </h2>
      {lines.fields.length > 0 && (
        <ul className="flex flex-col gap-3">
          {lines.fields.map((line, index) => {
            const asked = parseWholeNumber(
              typed[index]?.quantity ?? line.quantity,
              MAX_QUANTITY,
            );
            const available = free.get(line.itemId);
            const red =
              available !== undefined && asked !== null && asked > available;
            const failureText = lineFailureOf(failure, line.itemId);
            const locked = lockedPriceIds.has(line.itemId);
            return (
              <li key={line.id}>
                <fieldset
                  aria-labelledby={`${line.id}-name`}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p
                      id={`${line.id}-name`}
                      className="min-w-0 break-words font-medium"
                    >
                      {line.itemName}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={texts.removeItem(line.itemName)}
                      onClick={() => lines.remove(index)}
                    >
                      {texts.remove}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      id={`${line.id}-quantity`}
                      label={texts.quantity}
                      inputMode="numeric"
                      error={errors.lines?.[index]?.quantity?.message}
                      {...register(`lines.${index}.quantity`)}
                    />
                    <TextField
                      id={`${line.id}-price`}
                      label={texts.price}
                      inputMode="numeric"
                      readOnly={locked}
                      error={errors.lines?.[index]?.price?.message}
                      {...register(`lines.${index}.price`)}
                    />
                  </div>
                  {locked && (
                    <p className="text-sm text-muted-foreground">
                      {texts.priceFixed}
                    </p>
                  )}
                  {available !== undefined && (
                    <p
                      className={
                        red
                          ? "text-sm text-destructive"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {texts.free(available)}
                    </p>
                  )}
                  {failureText && <ErrorText>{failureText}</ErrorText>}
                </fieldset>
              </li>
            );
          })}
        </ul>
      )}
      {listError && <ErrorText>{listError}</ErrorText>}
      <Button type="button" variant="outline" onClick={onAdd}>
        {texts.addItem}
      </Button>
    </section>
  );
}
