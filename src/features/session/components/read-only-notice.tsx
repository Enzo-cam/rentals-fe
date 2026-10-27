import { READ_ONLY_NOTICE } from "./texts";

export function ReadOnlyNotice() {
  return (
    <p role="status" className="rounded-lg border p-3 text-sm">
      {READ_ONLY_NOTICE}
    </p>
  );
}
