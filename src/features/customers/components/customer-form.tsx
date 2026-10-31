"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";

import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { isInvalidWhatsapp, takenWhatsappOf } from "../api/failures";
import {
  customerFormSchema,
  EMPTY_CUSTOMER_FORM,
  type Customer,
  type CustomerFormValues,
} from "../types";
import { FORM_ERRORS, FORM_TEXTS, INVALID_WHATSAPP } from "./texts";

type CustomerFormProps = {
  defaultValues?: CustomerFormValues;
  onSubmit: (
    values: CustomerFormValues,
    opened: CustomerFormValues,
  ) => string | void;
  onEditTaken: (customer: Customer) => void;
  busy: boolean;
  error: unknown;
};

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

/**
 * `method="post"` is a net for a submit before hydration. Errors of shape come from the schema and the ones of the
 * API show under the field they are about: the WhatsApp that is not a number (400) or that another customer has
 * (409, with a button to edit that customer); anything else goes above the button. `onSubmit` may answer with a text
 * to show there instead of sending (the edit with nothing changed). The values stay as typed after a failure. With
 * `defaultValues` (the edit), the form gives them to `onSubmit` as what it opened with.
 */
export function CustomerForm({
  defaultValues,
  onSubmit,
  onEditTaken,
  busy,
  error,
}: CustomerFormProps) {
  const opened = defaultValues ?? EMPTY_CUSTOMER_FORM;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: opened,
  });

  const taken = takenWhatsappOf(error);
  const invalidWhatsapp = isInvalidWhatsapp(error);
  const otherError = Boolean(error) && !taken && !invalidWhatsapp;

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit((values) => {
        const notice = onSubmit(values, opened);
        if (notice) setError("root.notice", { message: notice });
      })}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-name">{FORM_TEXTS.name}</Label>
        <Input
          id="customer-name"
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
        {errors.name && <ErrorText>{errors.name.message}</ErrorText>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-whatsapp">{FORM_TEXTS.whatsapp}</Label>
        <Input
          id="customer-whatsapp"
          inputMode="tel"
          autoComplete="off"
          aria-invalid={
            errors.whatsapp || taken || invalidWhatsapp ? true : undefined
          }
          {...register("whatsapp")}
        />
        {errors.whatsapp && <ErrorText>{errors.whatsapp.message}</ErrorText>}
        {invalidWhatsapp && <ErrorText>{INVALID_WHATSAPP}</ErrorText>}
        {taken && (
          <div className="flex flex-col gap-2">
            <ErrorText>{FORM_TEXTS.taken(taken.name)}</ErrorText>
            <Button
              type="button"
              variant="outline"
              onClick={() => onEditTaken(taken)}
            >
              {FORM_TEXTS.editTaken(taken.name)}
            </Button>
          </div>
        )}
      </div>
      {errors.root?.notice && <p role="status">{errors.root.notice.message}</p>}
      {otherError && <ErrorText>{describeError(error, FORM_ERRORS)}</ErrorText>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? FORM_TEXTS.saving : FORM_TEXTS.save}
      </Button>
    </form>
  );
}
