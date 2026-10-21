# Arquitectura del frontend

**Este documento es obligatorio.** Todo código de `rentals-fe` lo respeta, y `revisor-estandares` revisa cada PR
contra él. Apartarse requiere cambiarlo primero, en una PR propia con su motivo. La decisión está en
[ADR-0002](adr/0002-arquitectura-por-features.md).

## 1. Principios

1. **Organizado por feature.** Todo lo de una funcionalidad (componentes, hooks, llamadas a la API, tipos de UI)
   vive junto.
2. **Rutas finas.** `src/app/` compone features y decide el renderizado. No tiene lógica.
3. **Servidor primero donde importa.** Lo público se renderiza en el servidor (SEO, vista previa de WhatsApp). La
   aplicación del negocio es interactiva y pide datos con React Query.
4. **Mínimo estado y mínimos efectos.** Cada pieza de estado tiene un solo dueño (§5). `useEffect` está prohibido
   salvo para sincronizar con un sistema externo (§6).
5. **Sin lógica de negocio** (INV-FE-01). Disponibilidad, estados y montos vienen de la API.

## 2. Carpetas

```text
src/
├── app/                        rutas: composición y renderizado, nada más
│   ├── (publico)/              landing y páginas indexables: Server Components, sin React Query
│   ├── p/[token]/              link de presupuesto: Server Component, noindex, Open Graph
│   ├── (app)/                  aplicación del negocio: islas de cliente con React Query
│   ├── (admin)/                backoffice (paso 9)
│   ├── api/[...path]/          proxy BFF (ADR-0001)
│   └── (dev)/gallery/          galería de stories para tests de componentes; 404 en producción
├── features/
│   └── <feature>/              nombre "En código" del glosario: bookings, items, availability…
│       ├── components/         UI del feature (*.tsx) y sus stories (*.story.tsx)
│       ├── hooks/              hooks del feature: React Query y estado de UI
│       ├── api/                query keys y funciones que llaman al cliente generado
│       ├── types.ts            solo tipos de UI: valores de formulario, filtros, view models
│       └── index.ts            API pública del feature: lo único que se importa desde afuera
├── api/                        cliente generado del OpenAPI, server.ts (solo servidor), QueryClient
├── components/ui/              shadcn/ui y piezas visuales sin dominio
└── lib/
    ├── format/                 plata y fechas: un solo formateador de cada uno (INV-FE-05)
    └── effects/                los únicos hooks con useEffect del repo (§6)
```

**Reglas de dependencias** (dependency-cruiser en CI, desde el paso 1b):

| Desde | Puede importar | No puede importar |
|---|---|---|
| `app/` | `features/*/index.ts`, `components/ui`, `lib`, `api/server.ts` | El interior de un feature |
| `features/A` | Su propio interior, `features/B/index.ts`, `components/ui`, `lib`, `api` | El interior de `features/B` |
| `components/ui` | `lib` | `features`, `api` |
| `lib` | Nada del proyecto | `features`, `api`, `components` |
| Código de cliente | — | `api/server.ts` (lleva `import 'server-only'`) |

## 3. Anatomía de un feature

```text
features/bookings/
├── api/
│   ├── keys.ts                 bookingKeys.all / .list(filters) / .detail(id)
│   └── requests.ts             funciones finas sobre el cliente generado: sin transformar reglas
├── hooks/
│   ├── use-bookings.ts         useQuery con bookingKeys.list
│   └── use-confirm-booking.ts  useMutation con Idempotency-Key e invalidación
├── components/
│   ├── booking-list.tsx
│   └── booking-list.story.tsx
├── types.ts
└── index.ts
```

- **Tipos de la API:** salen siempre del cliente generado (`components['schemas']['Booking']`). `types.ts` nunca
  redefine un DTO (INV-FE-02).
- Un componente no llama a `fetch` ni al cliente: usa un hook del feature.
- Un hook no devuelve datos inventados: lo que viene de la API se muestra como viene, formateado con `lib/format`.

## 4. Datos

### Dónde se pide cada cosa

| Lugar | Cómo | Por qué |
|---|---|---|
| `(publico)`, `p/[token]` | Server Component con `api/server.ts` | HTML completo para Google y WhatsApp |
| `(app)` | React Query en el cliente, por el proxy `/api` | Interactivo, con caché, reintentos e invalidación |

### Reglas de React Query

1. **Query keys por feature**, con una factory en `api/keys.ts`. Nunca un array suelto en un componente.
2. **Cambiar de negocio o cerrar sesión ejecuta `queryClient.clear()`** antes de navegar. Ningún dato de un negocio
   sobrevive en memoria al cambio (INV-FE-04).
3. **Disponibilidad y estados de reserva: `staleTime: 0` y sin actualizaciones optimistas.** El front espera la
   respuesta del backend, que es quien decide (INV-FE-01).
4. **Mutaciones con efecto** (crear reserva, cambiar estado, registrar devolución) usan `useIdempotentMutation`.
   Genera la `Idempotency-Key` al iniciar la acción y la reutiliza en cada reintento de esa misma acción
   (ADR-0005 de `rentals-be`). Las mutaciones no se reintentan solas.
5. **Invalidación explícita:** cada mutación declara qué keys invalida, en su propio hook.
6. **Errores mapeados en un solo lugar** (`api/`):
   - `401` → al login.
   - `403 read_only` → aviso de solo lectura.
   - `403 forbidden` → "no tenés permiso".
   - `404` → "no existe".
   - `429` → reintentar más tarde, con el `Retry-After` de la respuesta.

## 5. Estado: un solo dueño por cada cosa

| Qué | Dónde vive | No va en |
|---|---|---|
| Datos del servidor | React Query | `useState`, contexto |
| Filtros, fechas consultadas, pestaña activa, paginación | La URL (`searchParams`) | `useState` |
| Campos de formulario | react-hook-form + Zod (solo forma) | `useState` por campo |
| Algo que se calcula de otro estado | Se calcula al renderizar | `useState` + `useEffect` |
| Sesión y negocio activo | La API (`GET /me`) vía React Query | Contexto propio, `localStorage` |
| Efímero de UI: diálogo abierto, menú desplegado, paso de un asistente | `useState`, local al componente | Global |

- No hay librería de estado global (ni Redux ni Zustand). Si aparece la necesidad, se cambia este documento primero.
- Un `useState` que no sea efímero de UI es un hallazgo de revisión.
- Contexto de React solo para proveedores (QueryClient, tema). Nunca para datos del negocio.

## 6. Efectos

**`useEffect` y `useLayoutEffect` solo existen dentro de `src/lib/effects/`.** Una regla de ESLint
(`no-restricted-imports` / `no-restricted-syntax`) los prohíbe en el resto del repo. Cada efecto es un hook con
nombre (`useMediaQuery`, `useDocumentVisibility`…) que sincroniza con **un sistema externo a React**: una API del
navegador, una suscripción o una librería sin hook. Cuando el sistema expone una suscripción, se usa
`useSyncExternalStore` en vez de un efecto.

Reemplazos obligatorios ([react.dev, "You Might Not Need an Effect"](https://react.dev/learn/you-might-not-need-an-effect)):

| En vez de… | Se hace… |
|---|---|
| Pedir datos en un efecto | React Query (`(app)`) o Server Component (público) |
| Calcular un valor derivado en un efecto | Calcularlo al renderizar (`useMemo` solo si se midió que hace falta) |
| Resetear estado cuando cambia una prop | `key` en el componente |
| Ejecutar lógica por un evento del usuario | El handler del evento |
| Sincronizar estado con la URL | La URL es el estado (§5) |
| Avisar al padre de un cambio | Llamar al callback en el handler |

## 7. Server y Client Components

- Por defecto, Server Component. `'use client'` solo en las hojas que necesitan interactividad, nunca en un layout
  ni en una página entera de `(publico)`.
- En `(app)`, la página es un Server Component fino que monta la isla de cliente del feature.
- Nada que venga de `process.env` sin `NEXT_PUBLIC_` llega a un componente de cliente (INV-FE-04).

## 8. SEO

Detalle en la skill `seo-tecnico`. Mínimo obligatorio:

- **Páginas públicas:** Server Component, `generateMetadata` con title, description y canonical; `sitemap.ts` y
  `robots.ts`; JSON-LD de negocio local en la landing.
- **`p/[token]`:** `robots: noindex`, Open Graph completo (título, descripción, imagen) para la vista previa de
  WhatsApp, `Referrer-Policy: no-referrer`, fuera del sitemap (INV-FE-03).
- **`(app)`, `(admin)`, `(dev)/gallery`:** `noindex`, fuera del sitemap.
- **Core Web Vitals en páginas públicas:** LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (umbrales "buenos" de Google),
  medidos a 360 px de ancho.

## 9. Tests

| Qué | Con qué | Dónde |
|---|---|---|
| Flujos de punta a punta (consultar, reservar, compartir el link, hoja del fin de semana) | Playwright, proyecto móvil a 360 px | `e2e/flows/` |
| Páginas: render y SEO (title, description, canonical, `noindex`, Open Graph, JSON-LD, status) | Playwright | `e2e/pages/` |
| Componentes en aislamiento: estados vacío, cargando, error, solo lectura, por rol | Playwright `mount()` sobre stories (`*.story.tsx`) servidas por `app/(dev)/gallery` | Junto al componente |
| Funciones puras (`lib/format`, keys, mapeos) | Vitest | Junto al archivo, `*.test.ts` |

- La red se simula con `page.route` (Playwright). Las stories traen sus datos y proveedores.
- Selectores por rol y texto accesible (`getByRole`, `getByLabel`); `data-testid` solo si no hay alternativa.
- Cada componente con estados tiene una story por estado, y cada story su test.
- `app/(dev)/gallery` responde 404 cuando `NODE_ENV === 'production'`.

## 10. Nombres

- Código en inglés (ADR-0001 de `rentals-be`); textos de pantalla en español.
- Archivos en `kebab-case`, componentes exportados en `PascalCase`, hooks `useAlgo`.
- Features con el nombre "En código" del glosario de `rentals-be`.

## Checklist de revisión

- [ ] ¿Algún `useEffect` o `useLayoutEffect` fuera de `src/lib/effects/`?
- [ ] ¿Algún `useState` con datos del servidor, de un formulario, de un filtro o derivado?
- [ ] ¿Algún import al interior de otro feature?
- [ ] ¿Algún DTO escrito a mano o `fetch` directo desde un componente?
- [ ] ¿Las mutaciones con efecto usan `useIdempotentMutation` y declaran sus invalidaciones?
- [ ] ¿Alguna actualización optimista de disponibilidad o de estado de reserva?
- [ ] ¿La página pública tiene metadata completa y la privada `noindex`?
- [ ] ¿Cada estado del componente tiene su story y su test de Playwright?
