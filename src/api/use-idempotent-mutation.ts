import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useState } from "react";

import { createIdempotencyKeys, runWithKey } from "./idempotency";

type IdempotentMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  "mutationFn"
> & {
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
  intentOf?: (variables: TVariables) => string;
};

/**
 * A `useMutation` whose function also gets the `Idempotency-Key` of the action. The key follows the intent
 * (`intentOf`, one per hook instance by default; a screen with several actions on one record passes e.g.
 * `${bookingId}:confirm`), not the body: the key is held until the action succeeds, and any failure keeps it, because
 * the API stores a key only for a successful effect (`createIdempotencyKeys` has the why). Mount the hook in the
 * screen that owns the action, not in a sheet or dialog that unmounts on close, or the key is lost; and after a success
 * leave the screen or reset the form, because the next tap is a new action.
 * The keys are held in `useState(() => …)` and not in a ref: they are not render state, and lint flags a ref read
 * during render.
 * @see docs/architecture.md §4
 */
export function useIdempotentMutation<TData, TVariables>({
  mutationFn,
  intentOf = () => "",
  ...options
}: IdempotentMutationOptions<TData, TVariables>) {
  const [keys] = useState(() => createIdempotencyKeys());
  return useMutation<TData, Error, TVariables>({
    ...options,
    mutationFn: (variables) =>
      runWithKey(keys, intentOf(variables), (key) =>
        mutationFn(variables, key),
      ),
  });
}
