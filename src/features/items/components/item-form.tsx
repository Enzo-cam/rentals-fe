"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm, type Path, type UseFormReturn } from "react-hook-form";

import { describeError } from "@/api/failure-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { isOutOfServiceExceeded, takenItemOf } from "../api/failures";
import {
  editFormSchemaOf,
  EMPTY_ITEM_FORM,
  itemFormSchema,
  type ItemFormValues,
} from "../types";
import { TakenItemNotice } from "./taken-item-notice";
import { FORM_ERRORS, FORM_TEXTS, OUT_OF_SERVICE_EXCEEDED } from "./texts";

type ItemFormProps = {
  defaultValues?: ItemFormValues;
  onSubmit: (values: ItemFormValues, opened: ItemFormValues) => string | void;
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
 * API show under the field they are about: the name or the code that is taken, the out of service units that do not
 * fit; anything else goes above the button. `onSubmit` may answer with a text to show there instead of sending
 * (the edit with nothing changed). The values stay as typed after a failure. With `defaultValues` (the edit), the form
 * keeps what it opened with and gives it to `onSubmit` and to the schema: what the item is now, on the server, is not
 * its business.
 */
export function ItemForm({
  defaultValues,
  onSubmit,
  busy,
  error,
}: ItemFormProps) {
  const form: UseFormReturn<ItemFormValues> = useForm<ItemFormValues>({
    resolver: (values, context, options) =>
      zodResolver(
        defaultValues ? editFormSchemaOf(openedValues()) : itemFormSchema,
      )(values, context, options),
    defaultValues: defaultValues ?? EMPTY_ITEM_FORM,
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  function openedValues(): ItemFormValues {
    return { ...EMPTY_ITEM_FORM, ...form.formState.defaultValues };
  }

  const taken = takenItemOf(error);
  const outOfServiceExceeded = isOutOfServiceExceeded(error);
  const otherError = Boolean(error) && !taken && !outOfServiceExceeded;

  function field(
    name: Path<ItemFormValues>,
    label: string,
    notice?: ReactNode,
  ) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          autoComplete="off"
          aria-invalid={errors[name] ? true : undefined}
          {...register(name)}
        />
        {errors[name] && <ErrorText>{errors[name].message}</ErrorText>}
        {notice}
      </div>
    );
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={handleSubmit((values) => {
        const notice = onSubmit(values, openedValues());
        if (notice) setError("root.notice", { message: notice });
      })}
      className="flex flex-col gap-4"
    >
      {field(
        "name",
        FORM_TEXTS.name,
        taken?.field === "name" && <TakenItemNotice taken={taken} />,
      )}
      {field("totalStock", FORM_TEXTS.totalStock)}
      {field(
        "outOfService",
        FORM_TEXTS.outOfService,
        outOfServiceExceeded && (
          <ErrorText>{OUT_OF_SERVICE_EXCEEDED}</ErrorText>
        ),
      )}
      {field("price", FORM_TEXTS.price)}
      {field("category", FORM_TEXTS.category)}
      {field(
        "code",
        FORM_TEXTS.code,
        taken?.field === "code" && <TakenItemNotice taken={taken} />,
      )}
      {field("description", FORM_TEXTS.description)}
      {errors.root?.notice && <p role="status">{errors.root.notice.message}</p>}
      {otherError && <ErrorText>{describeError(error, FORM_ERRORS)}</ErrorText>}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? FORM_TEXTS.saving : FORM_TEXTS.save}
      </Button>
    </form>
  );
}
