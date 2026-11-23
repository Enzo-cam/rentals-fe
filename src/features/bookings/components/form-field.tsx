import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

/** A label, its control and what is said about it: the error under the field and, if it has one, a note after it. */
export function Field({
  id,
  label,
  error,
  note,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
      {note}
    </div>
  );
}

/** A `Field` with an `Input`: the rest of the props go to the input, so `register(name)` spreads here. */
export function TextField({
  id,
  label,
  error,
  note,
  ...input
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
  note?: ReactNode;
}) {
  return (
    <Field id={id} label={label} error={error} note={note}>
      <Input
        id={id}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        {...input}
      />
    </Field>
  );
}
