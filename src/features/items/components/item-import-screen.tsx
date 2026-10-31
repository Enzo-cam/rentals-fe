"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch, type Control } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/routes";

import { rejectedPreviewOf } from "../api/failures";
import { useItemImport } from "../hooks/use-item-import";
import { importFormSchema, type ImportFormValues } from "../types";
import { ImportPreview } from "./import-preview";
import { IMPORT_TEXTS, importFailureText } from "./import-texts";
import { ManageGate } from "./manage-gate";

type ConfirmBarProps = {
  control: Control<ImportFormValues>;
  previewed: string;
  count: number;
  busy: boolean;
  onConfirm: () => void;
};

/** A preview is of the text that was sent: once the text is different the confirmation goes and asks for a new one. */
function ConfirmBar({
  control,
  previewed,
  count,
  busy,
  onConfirm,
}: ConfirmBarProps) {
  const text = useWatch({ control, name: "text" });
  if (text !== previewed) return <p role="status">{IMPORT_TEXTS.changed}</p>;
  return (
    <Button type="button" size="lg" disabled={busy} onClick={onConfirm}>
      {busy ? IMPORT_TEXTS.confirming : IMPORT_TEXTS.confirm(count)}
    </Button>
  );
}

function ImportForm() {
  const { preview, confirm, previewText, confirmOnce } = useItemImport();
  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
    defaultValues: { text: "" },
  });
  const rejected = rejectedPreviewOf(confirm.error);
  const shown = rejected ?? (confirm.isSuccess ? undefined : preview.data);
  const failure = confirm.error ?? preview.error;
  const textError = form.formState.errors.text;

  return (
    <div className="flex flex-col gap-4">
      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit((values) => previewText(values.text))}
        className="flex flex-col gap-2"
      >
        <Label htmlFor="text">{IMPORT_TEXTS.label}</Label>
        <p className="text-sm text-muted-foreground">{IMPORT_TEXTS.help}</p>
        <textarea
          id="text"
          rows={8}
          autoComplete="off"
          aria-invalid={textError ? true : undefined}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
          {...form.register("text")}
        />
        {textError && (
          <p role="alert" className="text-sm text-destructive">
            {textError.message}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={preview.isPending || confirm.isPending}
        >
          {preview.isPending ? IMPORT_TEXTS.previewing : IMPORT_TEXTS.preview}
        </Button>
      </form>
      {failure && <p role="alert">{importFailureText(failure)}</p>}
      {confirm.isSuccess && (
        <div className="flex flex-col gap-2">
          <p role="status">{IMPORT_TEXTS.created(confirm.data.created)}</p>
          <Link
            href={ROUTES.items}
            className={buttonVariants({ variant: "outline" })}
          >
            {IMPORT_TEXTS.back}
          </Link>
        </div>
      )}
      {shown && <ImportPreview preview={shown} />}
      {shown?.valid && !rejected && preview.variables !== undefined && (
        <ConfirmBar
          control={form.control}
          previewed={preview.variables}
          count={shown.rows.length}
          busy={confirm.isPending}
          onConfirm={() =>
            confirmOnce(preview.variables ?? "", () => form.reset())
          }
        />
      )}
    </div>
  );
}

/** Opens only for who can manage; the list is sent as typed and the API is the one that reads it (INV-FE-01). */
export function ItemImportScreen() {
  return (
    <ManageGate>
      <ImportForm />
    </ManageGate>
  );
}
