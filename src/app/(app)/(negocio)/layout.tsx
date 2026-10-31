import type { ReactNode } from "react";

import { AppNavigation } from "@/features/session";

/** `pb-16` is the height of the bar, so it never covers the last row or "Ver más". */
export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <AppNavigation />
    </>
  );
}
