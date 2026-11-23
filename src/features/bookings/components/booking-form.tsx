"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import type { components } from "@/api/schema";
import { describeError } from "@/api/failure-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFreeUnits } from "@/features/availability";
import { CustomerSheet, type SheetTarget } from "@/features/customers";
import { pesosTextOf } from "@/lib/format/money";
import { ROUTES } from "@/lib/routes";

import { bookingFormSchema } from "../api/booking-body";
import type { BookingEdit } from "../api/edit";
import { formFailureOf, type FormFailure } from "../api/failures";
import {
  EMPTY_BOOKING_FORM,
  type ActiveItem,
  type BookingFormValues,
  type BookingLineValues,
} from "../types";
import { BookingLines } from "./booking-lines";
import { BookingMoney } from "./booking-money";
import { CustomerPicker } from "./customer-picker";
import { ErrorText, Field, TextField } from "./form-field";
import { ItemPicker } from "./item-picker";
import {
  BOOKING_ACTION_TEXTS,
  BOOKING_FORM_ERRORS,
  BOOKING_FORM_FAILURES,
  BOOKING_FORM_TEXTS,
  BOOKING_STATUS_LABELS,
} from "./texts";

type Customer = components["schemas"]["Customer"];

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base";

const NO_ITEMS: ReadonlySet<string> = new Set();

/**
 * What the API said about the lines when they are not on screen: one text per item, with its name taken from the lines of
 * the form, because there is no line to put it under. A delivered booking edits only the pickup, and a changed pickup is
 * checked against the stock again (409 `insufficient_stock`) and against the items taken down (`item_archived`).
 * AC-19, AC-21 (rentals-be#29)
 */
function hiddenLineFailuresOf(
  failure: FormFailure | null,
  lines: BookingLineValues[],
): { key: string; text: string }[] {
  const texts = BOOKING_ACTION_TEXTS;
  const nameOf = (itemId: string) =>
    lines.find((line) => line.itemId === itemId)?.itemName ?? texts.unknownItem;
  if (failure?.kind === "short") {
    return failure.items.map((item) => ({
      key: item.itemId,
      text: texts.notEnough(
        nameOf(item.itemId),
        item.requested,
        item.available,
      ),
    }));
  }
  if (failure?.kind === "archived") {
    return failure.itemIds.map((itemId) => ({
      key: itemId,
      text: texts.archivedItem(nameOf(itemId)),
    }));
  }
  return [];
}

/**
 * The form of a booking, new or to edit. Errors of shape come from the schema and show under their field; what the API
 * said shows where it is about: the stock and the baja under the line (above the button, with the name of the item, when
 * the lines are not on screen), the pickup and the hold expiry under their dates, and anything else above the button. The values stay as typed after a failure. The pickers and the sheet of the new
 * customer are siblings of the `<form>` and never inside it: a portal keeps its place in the React tree, so their
 * submit would climb to this form and save the booking before the person asked. Every button that does not save is
 * `type="button"`. What is open is the only `useState` here, plus the target of the sheet of the customers: they are
 * UI (docs/architecture.md §5); the choices of the person are `setValue` in the handlers, and what depends on the
 * fields (the free units, the suggested total) is read from them while it renders (INV-FE-06).
 * With `edit` it is the form of a booking that exists: it opens with its values and follows the rules of its status
 * (`bookingEditOf`, not the `status` of the form, which is not shown): what the status does not let change is not
 * shown, the prices of the lines that were there are read only when they are fixed, and so is a deposit already loaded.
 * It keeps what it opened with and gives it to `onSubmit`, so the patch carries only what changed, and the units free
 * are asked only for the lines that are new (the API counts the booking itself as taking the old ones). `onSubmit` may
 * answer with a text to show instead of sending (the edit with nothing changed).
 * AC-1, AC-3, AC-5, AC-16, AC-17, AC-18, AC-19 (rentals-be#29)
 */
export function BookingForm({
  edit,
  onSubmit,
  busy,
  error,
}: {
  edit?: { defaultValues: BookingFormValues; rules: BookingEdit };
  onSubmit: (
    values: BookingFormValues,
    opened: BookingFormValues,
  ) => string | void;
  busy: boolean;
  error: unknown;
}) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: edit?.defaultValues ?? EMPTY_BOOKING_FORM,
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitted },
  } = form;

  function openedValues(): BookingFormValues {
    return {
      ...EMPTY_BOOKING_FORM,
      ...form.formState.defaultValues,
    } as BookingFormValues;
  }
  const lineArray = useFieldArray({ control, name: "lines" });
  const [sheet, setSheet] = useState<"customers" | "items" | null>(null);
  const [customerTarget, setCustomerTarget] = useState<SheetTarget>(null);
  const [status, customerName, deliveryAt, pickupAt, lines] = useWatch({
    control,
    name: ["status", "customerName", "deliveryAt", "pickupAt", "lines"],
  });
  const itemIds = lines.map((line) => line.itemId);
  const opened = openedValues();
  const wasThere = new Set(opened.lines.map((line) => line.itemId));
  const freeUnits = useFreeUnits(
    deliveryAt,
    pickupAt,
    itemIds.filter((itemId) => !wasThere.has(itemId)),
  );
  const free = new Map(
    (freeUnits.data?.items ?? []).map((item) => [item.itemId, item.available]),
  );
  const failure = formFailureOf(error);
  const texts = BOOKING_FORM_TEXTS;
  const rules = edit?.rules;
  const whole = rules?.wholeBooking ?? true;
  const hiddenLineFailures = whole ? [] : hiddenLineFailuresOf(failure, lines);

  function chooseCustomer(customer: Customer) {
    setValue("customerId", customer.id, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });
    setValue("customerName", customer.name);
    setSheet(null);
  }

  function addItem(item: ActiveItem) {
    const priceCents = "priceCents" in item ? item.priceCents : 0;
    lineArray.append(
      {
        itemId: item.id,
        itemName: item.name,
        quantity: "1",
        price: pesosTextOf(priceCents),
        filledPriceCents: priceCents,
      },
      { shouldFocus: false },
    );
    setSheet(null);
  }

  return (
    <>
      <form
        method="post"
        noValidate
        onSubmit={handleSubmit((values) => {
          const notice = onSubmit(values, openedValues());
          if (notice) setError("root.notice", { message: notice });
        })}
        className="flex flex-col gap-4"
      >
        {whole && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{texts.customer}</span>
            {customerName !== "" && (
              <p className="break-words font-medium">{customerName}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheet("customers")}
            >
              {customerName === ""
                ? texts.chooseCustomer
                : texts.changeCustomer}
            </Button>
            {errors.customerId && (
              <ErrorText>{errors.customerId.message}</ErrorText>
            )}
          </div>
        )}
        {!edit && (
          <Field id="booking-status" label={texts.status}>
            <select
              id="booking-status"
              className={SELECT_CLASS}
              {...register("status")}
            >
              <option value="hold">{BOOKING_STATUS_LABELS.hold}</option>
              <option value="confirmed">
                {BOOKING_STATUS_LABELS.confirmed}
              </option>
            </select>
          </Field>
        )}
        {status === "hold" && (rules?.holdExpiry ?? true) && (
          <TextField
            id="booking-hold-expires"
            label={texts.holdExpires}
            type="datetime-local"
            error={
              errors.holdExpiresAt?.message ??
              (failure?.kind === "holdExpiry"
                ? BOOKING_FORM_FAILURES.holdExpiry
                : undefined)
            }
            {...register("holdExpiresAt")}
          />
        )}
        {whole && (
          <TextField
            id="booking-delivery"
            label={texts.delivery}
            type="datetime-local"
            error={errors.deliveryAt?.message}
            {...register("deliveryAt")}
          />
        )}
        <TextField
          id="booking-pickup"
          label={texts.pickup}
          type="datetime-local"
          error={
            errors.pickupAt?.message ??
            (failure?.kind === "invalidPeriod"
              ? BOOKING_FORM_FAILURES.invalidPeriod
              : failure?.kind === "pickupInPast"
                ? BOOKING_FORM_FAILURES.pickupInPast
                : undefined)
          }
          {...register("pickupAt")}
        />
        {whole && (
          <>
            <TextField
              id="booking-event-date"
              label={texts.eventDate}
              type="date"
              error={errors.eventDate?.message}
              {...register("eventDate")}
            />
            <TextField
              id="booking-occasion"
              label={texts.occasion}
              error={errors.occasion?.message}
              {...register("occasion")}
            />
            <BookingLines
              form={form}
              lines={lineArray}
              free={free}
              lockedPriceIds={rules?.pricesFixed ? wasThere : NO_ITEMS}
              failure={failure}
              onAdd={() => setSheet("items")}
            />
            <BookingMoney
              form={form}
              depositSet={
                opened.depositAmount.trim() !== "" ||
                opened.depositDate.trim() !== ""
              }
            />
          </>
        )}
        <TextField
          id="booking-address"
          label={texts.address}
          error={errors.address?.message}
          {...register("address")}
        />
        <Field
          id="booking-note"
          label={texts.note}
          error={errors.note?.message}
        >
          <Textarea
            id="booking-note"
            aria-invalid={errors.note ? true : undefined}
            {...register("note")}
          />
        </Field>
        {failure?.kind === "keyReused" && (
          <div role="alert" className="flex flex-col gap-2">
            <p>{BOOKING_FORM_FAILURES.keyReused}</p>
            <Link
              href={ROUTES.bookings}
              className={buttonVariants({ variant: "outline" })}
            >
              {BOOKING_FORM_FAILURES.seeBookings}
            </Link>
          </div>
        )}
        {hiddenLineFailures.length > 0 && (
          <div role="alert" className="flex flex-col gap-1">
            {hiddenLineFailures.map(({ key, text }) => (
              <p key={key} className="text-sm text-destructive">
                {text}
              </p>
            ))}
          </div>
        )}
        {failure?.kind === "editRejected" && (
          <ErrorText>{BOOKING_FORM_FAILURES[failure.reason]}</ErrorText>
        )}
        {failure?.kind === "other" && (
          <ErrorText>{describeError(error, BOOKING_FORM_ERRORS)}</ErrorText>
        )}
        {errors.root?.notice && (
          <p role="status">{errors.root.notice.message}</p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? texts.saving : texts.save}
        </Button>
      </form>
      <CustomerPicker
        open={sheet === "customers"}
        onOpenChange={(open) => setSheet(open ? "customers" : null)}
        onPick={chooseCustomer}
        onNew={() => {
          setSheet(null);
          setCustomerTarget({ mode: "new" });
        }}
      />
      <CustomerSheet
        target={customerTarget}
        onTargetChange={setCustomerTarget}
        onSaved={chooseCustomer}
      />
      <ItemPicker
        open={sheet === "items"}
        onOpenChange={(open) => setSheet(open ? "items" : null)}
        taken={itemIds}
        onPick={addItem}
      />
    </>
  );
}
