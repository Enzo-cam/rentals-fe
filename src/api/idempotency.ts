export type IdempotencyKeys = {
  keyFor(intent: string): string;
  succeeded(intent: string, key: string): void;
};

/**
 * The `Idempotency-Key` is made by intent of the user, not by body: one key per action, held until the action succeeds
 * (ADR-0005 of `rentals-be`). The API stores a key only after a successful effect, and answers a 400 or a 403 before it
 * even reads the key; so after any failure keeping it is safe. If nothing was stored, a retry with the same key and any
 * body is evaluated from scratch. If a success was stored and its response was lost, the retry gets the replay (same
 * body) or a 422 `idempotency_key_reused` (another body, INV-08 de rentals-be), never a second booking. Releasing it on
 * a 400 or a 403 would let the person edit and send again with a new key after a lost success. `succeeded` acts only if
 * `key` is still the held one: a late answer of an older call must not release a newer one.
 * @see docs/architecture.md §4
 */
export function createIdempotencyKeys(
  newKey: () => string = () => crypto.randomUUID(),
): IdempotencyKeys {
  const held = new Map<string, string>();
  return {
    keyFor(intent) {
      const key = held.get(intent) ?? newKey();
      held.set(intent, key);
      return key;
    },
    succeeded(intent, key) {
      if (held.get(intent) === key) held.delete(intent);
    },
  };
}

/** Runs `call` with the key of the intent and releases it only if the call succeeds; any error goes up with the key kept. */
export async function runWithKey<TData>(
  keys: IdempotencyKeys,
  intent: string,
  call: (key: string) => Promise<TData>,
): Promise<TData> {
  const key = keys.keyFor(intent);
  const data = await call(key);
  keys.succeeded(intent, key);
  return data;
}
