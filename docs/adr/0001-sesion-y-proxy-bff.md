---
status: accepted
date: 2026-10-20
---

# Sesión por proxy propio en el mismo origen (BFF)

El navegador nunca llama a la API de `rentals-be` directo. Habla solo con el origen del front, y una ruta propia
de Next.js (`/api/[...path]`) reenvía cada pedido a la API, de servidor a servidor. Así la cookie de sesión es
*first-party* aunque el front y la API estén en dominios registrables distintos (no hay dominio propio en el MVP),
y Safari no la bloquea. Es la otra mitad de ADR-0004 de `rentals-be`, que define la sesión, el login y el CSRF del
lado de la API.

## Decisión

### Proxy `src/app/api/[...path]/route.ts`

- Runtime Node, `dynamic = 'force-dynamic'`: no se cachea nunca.
- **Reenvía hacia la API** solo una lista permitida de headers: `cookie`, `content-type`, `accept`,
  `idempotency-key`, `origin`, `user-agent`. Agrega:
  - `X-Origin-Secret`, desde una variable de entorno de servidor, nunca `NEXT_PUBLIC_*` (INV-FE-04).
  - `X-Forwarded-For` con la IP del cliente, para el rate limit del login.
- **Devuelve** el status, el body, `set-cookie`, `content-type`, `cache-control` y `retry-after`. Descarta los
  headers hop-by-hop.
- **CSRF:** rechaza con `403` toda mutación (`POST`, `PUT`, `PATCH`, `DELETE`) cuyo `Origin` (o, si falta,
  `Sec-Fetch-Site`) no sea el propio origen. La API lo vuelve a chequear.
- Tiene límite de tamaño del body y timeout.
- No interpreta ni transforma las respuestas: no hay lógica de negocio en el proxy (INV-FE-01).

### Server Components

- Un módulo `src/api/server.ts` con `import 'server-only'` lee la cookie del pedido con `cookies()` y llama a la API
  directo (`API_URL`, variable de servidor), con `X-Origin-Secret`.
- El cliente generado del OpenAPI (INV-FE-02) se configura con dos bases: `/api` en el navegador y `API_URL` en el
  servidor.

### Rutas

- `(app)`: el middleware de Next solo redirige al login si no hay cookie. Eso es comodidad: quien autoriza es la
  API. Ocultar botones según el rol también es comodidad, no seguridad.
- `p/[token]`: se renderiza en el servidor, con `noindex`, Open Graph para WhatsApp (INV-FE-03) y
  `Referrer-Policy: no-referrer`, para que el token no salga en el `Referer` hacia otros sitios.
- `(admin)`: grupo futuro para el backoffice (ADR-0006 de `rentals-be`), con su propia cookie
  (`__Host-admin_session`), `noindex`.

### Fuera por ahora

- **PWA:** postergada (fundador, 2026-10-20). Es un cambio de orden, no una reversión de la decisión del decision
  log (2026-10-17, "web instalable"). Cuando entre, el service worker no cachea `/api/*`.
- Offline: no.

## Alternativas descartadas

- **Rewrite de la plataforma de hosting:** ata la sesión a un proveedor. Además, el hosting del front está
  pendiente, y en Vercel el plan gratis no permite uso comercial.
- **Llamar a la API desde el navegador con CORS:** la cookie sería de terceros y Safari la bloquea.
- **Token en `localStorage`:** lo prohíbe INV-FE-04.

## Consecuencias

- El hosting del front tiene que poder correr route handlers de Node (cualquier host de Next.js con servidor).
- Cada pedido del navegador hace un salto más. Se mide en el paso 2.

## Cómo se verifica

- Test del proxy (paso 1b): un header que no está en la lista no llega a la API; `X-Origin-Secret` siempre va;
  `set-cookie` vuelve al navegador; una mutación con `Origin` ajeno → `403`.
- Test de build (paso 1b): ninguna variable `NEXT_PUBLIC_*` contiene `SECRET` ni `API_URL`.
- Paso 2, a mano: login en un iPhone real.
