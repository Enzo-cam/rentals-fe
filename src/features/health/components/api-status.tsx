import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getApiHealth } from "../api/requests";
import type { ApiHealth } from "../types";

const MESSAGES: Record<ApiHealth, string> = {
  ok: "La API responde.",
  down: "La API está caída. Probá de nuevo en unos minutos.",
  unreachable: "No pudimos conectar con la API.",
};

const DOT_COLORS: Record<ApiHealth, string> = {
  ok: "bg-green-600",
  down: "bg-amber-500",
  unreachable: "bg-red-600",
};

/** CardTitle renders a div, so the h2 inside makes the title a real heading. */
export async function ApiStatus() {
  const health = await getApiHealth();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Estado de la API</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p role="status" className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2.5 shrink-0 rounded-full ${DOT_COLORS[health]}`}
          />
          <span>{MESSAGES[health]}</span>
        </p>
      </CardContent>
    </Card>
  );
}
