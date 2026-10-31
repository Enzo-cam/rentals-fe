import Link from "next/link";

import type { components } from "@/api/schema";
import { formatCents } from "@/lib/format/money";
import { ROUTES } from "@/lib/routes";

import { IMPORT_TEXTS, rowErrorText } from "./import-texts";

type Preview = components["schemas"]["ItemImportPreview"];

/**
 * Read only: every row the API understood, in order and by its original line, with its errors under it. The rows
 * are fixed in the text, not here. An error that names an item links to it.
 */
export function ImportPreview({ preview }: { preview: Preview }) {
  const ok = preview.rows.filter((row) => row.errors.length === 0).length;
  return (
    <div className="flex flex-col gap-2">
      {preview.header && <p>{IMPORT_TEXTS.header(preview.header.line)}</p>}
      <p>{IMPORT_TEXTS.summary(preview.rows.length, ok)}</p>
      <ul className="flex flex-col gap-2">
        {preview.rows.map((row) => (
          <li
            key={row.line}
            className={`rounded-lg border p-2 break-words ${row.errors.length > 0 ? "border-destructive" : ""}`}
          >
            <p>
              {[
                IMPORT_TEXTS.line(row.line),
                row.name,
                row.totalStock,
                row.priceCents === null ? null : formatCents(row.priceCents),
              ]
                .filter((part) => part !== null)
                .join(" · ")}
            </p>
            {row.errors.map((error) => (
              <p key={error.code} className="text-sm text-destructive">
                {rowErrorText(error)}{" "}
                {error.item && (
                  <Link
                    href={ROUTES.item(error.item.id)}
                    className="text-foreground underline"
                  >
                    {IMPORT_TEXTS.see}
                  </Link>
                )}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
