# rentals-fe

Frontend de rentals en Next.js: la aplicación que usa el negocio desde el celular (consultar disponibilidad,
armar el presupuesto, la hoja del fin de semana, la devolución) y el sitio público (landing y links de
presupuesto que se comparten por WhatsApp).

**Las reglas de negocio viven en `rentals-be`.** Este repo no calcula disponibilidad, estados ni montos: los pide a
la API y los muestra. El vocabulario es el de `../rentals-be/GLOSSARY.md`.

## Stack

- Next.js 16.4 (App Router) + React 19.3 + TypeScript 5.9 estricto, Tailwind CSS 4.3, shadcn/ui (estilo
  `base-nova`). Node ≥ 24.7, pnpm 11.
- Datos: cliente tipado generado desde el OpenAPI de `rentals-be` con **openapi-typescript 7** (tipos, en
  `src/api/schema.d.ts`) y **openapi-fetch 0.17** (cliente). `pnpm api:sync` lo regenera. Nunca tipos escritos a mano
  para la API.
- Sesión: el navegador habla solo con este origen; el proxy `/api/[...path]` reenvía a la API (ADR-0001).
- PWA: postergada; por ahora es web online.
- Idioma: código en inglés, textos de pantalla en español (ADR-0001 de `rentals-be`).
- Estado y datos: React Query en `(app)`, Server Components en lo público, react-hook-form + Zod en formularios, sin
  librería de estado global (ADR-0002).
- Tests: **Playwright** para flujos, páginas (con SEO) y componentes (stories + `mount()`); **Vitest** solo para
  funciones puras (ADR-0002).

## Arquitectura (obligatoria)

**[`docs/architecture.md`](docs/architecture.md) manda sobre cómo se escribe cada archivo de este repo:** features,
reglas de imports, React Query, dónde vive cada estado, `useEffect` solo en `src/lib/effects/` (INV-FE-06), SEO y
tests. Toda PR pasa su checklist.

## Mapa

Lo que hay hoy (la estructura objetivo completa está en `docs/architecture.md` §2):

```text
src/
├── proxy.ts                    guardia optimista de /cuenta y /elegir-negocio: sin cookie, 307 a /ingresar
├── app/
│   ├── layout.tsx              <html lang="es-AR">, metadata base
│   ├── (publico)/page.tsx      "/": estado de la API (Server Component, noindex)
│   ├── (app)/layout.tsx        aplicación del negocio: noindex y <SessionProviders>
│   └── api/[...path]/route.ts  proxy BFF (ADR-0001)
├── features/
│   ├── health/                 llamada a GET /health y su tarjeta de estado
│   └── session/                sesión de los usuarios de los negocios: QueryClient del navegador y sus redirects
├── api/
│   ├── openapi.json            contrato copiado de rentals-be (openapi.source.json dice de qué commit)
│   ├── schema.d.ts             tipos generados: no se editan
│   ├── server.ts               solo servidor: cliente con API_URL + X-Origin-Secret, y el proxy
│   ├── browser-client.ts       cliente del navegador: baseUrl /api, timeout de 15 s
│   ├── api-failure.ts          errores de la API: ApiFailure, ApiError, unwrap, Retry-After
│   ├── failure-message.ts      textos genéricos de cada falla
│   ├── query-client.ts         QueryClient: un reintento solo por red o 5xx, mutaciones sin reintento
│   ├── bff-proxy.ts            el proxy: CSRF, límite de body, timeout, errores 5xx
│   ├── proxy-rules.ts          reglas puras del proxy: listas de headers, CSRF, IP del cliente
│   └── server-env.ts           lee API_URL, ORIGIN_SECRET y FRONT_ORIGIN
├── components/ui/              shadcn/ui (card)
└── lib/                        routes.ts (rutas y destino al entrar); format/ y effects/ llegan con su primer uso
e2e/                            Playwright: flows/, pages/, proxy/ y support/ (API falsa local, con sesión)
scripts/                        api-sync, api-check, check-client-env
```

## Reglas

1. **Mobile-first.** Cada pantalla de `(app)` se diseña y se prueba primero a 360 px de ancho.
2. **Sin lógica de negocio.** Si un componente decide si hay stock o cuánto se cobra, la lógica está en el repo
   equivocado.
3. **Contrato primero.** Una pantalla que necesita un endpoint nuevo espera a la PR de `rentals-be` que lo
   publica. La PR del frontend dice qué versión del OpenAPI consume.
4. **SEO técnico** (skill `seo-tecnico`): lo público, renderizado en el servidor; lo privado y los links de
   presupuesto, con `noindex` y fuera del sitemap.
5. **WhatsApp por links `wa.me`**, sin API.

## Módulos de referencia

Se completan con la primera pantalla que pase `/review-pr`.

| Para | Mirá |
|---|---|
| Una pantalla de la aplicación | — |
| Una página pública | — |
| Un formulario con validación | — |
| Un test de componente | — |

## Contrato para agentes

- **Plan de trabajo actual:** `../rentals-be/docs/plan-boceto.md` (los pasos `1b` y los de pantallas son de este repo)
- Comandos: [`docs/agents/commands.md`](docs/agents/commands.md)
- Invariantes: [`docs/agents/invariants.md`](docs/agents/invariants.md)
- **Arquitectura:** [`docs/architecture.md`](docs/architecture.md)
- Glosario: `../rentals-be/GLOSSARY.md` · Decisiones: [`docs/adr/`](docs/adr/) (sesión y proxy:
  [0001](docs/adr/0001-sesion-y-proxy-bff.md); features, estado y tests:
  [0002](docs/adr/0002-arquitectura-por-features.md)) y las de `../rentals-be/docs/adr/`

## Presupuesto de PR

- Máximo 700 líneas de lógica de producción por PR. Tests, cliente generado y estilos no cuentan. La PR resume qué
  casos y bordes cubren los tests.
- Un solo foco por PR.
- Toda PR enlaza su ticket como `Enzo-cam/rentals-be#N`.

## Comentarios

- **El objetivo es que los comentarios sean útiles, no que no haya ninguno.** Un comentario útil explica un porqué
  que el código no puede decir: un comportamiento del navegador o de Next, un riesgo de seguridad, una decisión
  tomada. Lo que el nombre de la función, el componente o el test ya dice, no se comenta.
- Van como JSDoc `/** … */` justo antes de la declaración (función, componente, type, const, objeto de config),
  nunca dentro del cuerpo de una función, entre sentencias ni en JSX. En dependency-cruiser, el campo `comment`.
- Si el porqué ya está en un ADR, en `docs/architecture.md` o en un invariante, el JSDoc lo referencia
  (`@see docs/adr/0001-sesion-y-proxy-bff.md`, `INV-FE-04`) en vez de repetirlo. Los archivos generados no se tocan.

## Commits

- **Se agrupan por archivos relacionados:** un commit por pieza (configuración, herramientas, cliente de la API,
  proxy, un feature con su página, CI, docs), con el código y sus tests en el mismo commit. Ni un commit gigante con
  todo, ni uno por archivo: la PR se tiene que poder seguir commit por commit.
- Mensajes en inglés (ADR-0001 de `rentals-be`), con prefijo convencional: `feat`, `fix`, `refactor`, `test`,
  `chore`, `ci`, `docs`.
- Nadie commitea, pushea ni abre una PR sin pedido explícito del humano.

## Agent skills

### Issue tracker

Los tickets viven en `Enzo-cam/rentals-be`, no en este repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Las cinco etiquetas por defecto, gestionadas en `rentals-be`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, con el glosario en `rentals-be`. See `docs/agents/domain.md`.
