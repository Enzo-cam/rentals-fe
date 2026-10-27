import { failureOf, retryAfterMinutes, type ApiFailure } from "./api-failure";

const GENERIC_BY_CODE: Record<string, string> = {
  read_only:
    "No se guardó: tu negocio está en solo lectura. Escribinos para reactivarlo.",
  forbidden:
    "Tu rol no permite hacer esto. Si lo necesitás, pedíselo al dueño del negocio.",
  business_not_found: "Ya no tenés acceso a este negocio.",
  payload_too_large: "Es demasiado grande para mandarlo de una vez.",
};

/**
 * `byCode` holds the texts of one screen for the codes of the API and wins over the generic text of the code;
 * anything else gets the generic text.
 */
export function describeFailure(
  failure: ApiFailure,
  byCode: Record<string, string> = {},
): string {
  switch (failure.kind) {
    case "rejected":
      return (
        (failure.code !== null
          ? (byCode[failure.code] ?? GENERIC_BY_CODE[failure.code])
          : undefined) ?? "Algo salió mal. Probá de nuevo."
      );
    case "network":
      return "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.";
    case "unavailable":
      return "El sistema no está respondiendo. Probá de nuevo en unos minutos.";
    case "rate_limited": {
      if (failure.retryAfterSeconds === null) {
        return "Hubo demasiados intentos. Probá de nuevo en unos minutos.";
      }
      const minutes = retryAfterMinutes(failure.retryAfterSeconds);
      return `Hubo demasiados intentos. Probá de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
    }
    case "unauthenticated":
      return "Algo salió mal. Probá de nuevo.";
  }
}

/** For a caught `error` of any kind: one that is not an `ApiError` gets the generic text. */
export function describeError(
  error: unknown,
  byCode: Record<string, string> = {},
): string {
  return describeFailure(
    failureOf(error) ?? { kind: "rejected", status: 0, code: null },
    byCode,
  );
}
