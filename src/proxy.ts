import { NextResponse, type NextRequest } from "next/server";

import { ROUTES } from "@/lib/routes";

const SESSION_COOKIE = "__Host-session";

/**
 * Optimistic check: it only sees whether the cookie exists, and the API is the one that authorizes every call.
 * @see docs/adr/0001-sesion-y-proxy-bff.md
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL(ROUTES.signIn, request.url));
}

/**
 * Literal and narrow on purpose: Next reads it statically, and a mistake here must not reach `/`, `/api` or `_next`.
 * The items are guarded at `/articulos` and under it, the customers at `/clientes` and under it, and the availability
 * at `/disponibilidad`, and the bookings at `/reservas` and under it.
 */
export const config = {
  matcher: [
    "/cuenta",
    "/elegir-negocio",
    "/articulos",
    "/articulos/:path*",
    "/clientes",
    "/clientes/:path*",
    "/disponibilidad",
    "/reservas",
    "/reservas/:path*",
  ],
};
