import type { Customer } from "../types";

/** With `onOpen` the row is a button that edits the customer; without it (who cannot manage) it is only text. */
export function CustomerRow({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: (() => void) | null;
}) {
  const content = (
    <>
      <span className="min-w-0 break-words font-medium">{customer.name}</span>
      <span className="text-sm text-muted-foreground">{customer.whatsapp}</span>
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 w-full flex-col gap-1 rounded-lg border p-3 text-left"
        >
          {content}
        </button>
      ) : (
        <div className="flex flex-col gap-1 rounded-lg border p-3">
          {content}
        </div>
      )}
    </li>
  );
}
