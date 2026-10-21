# rentals-fe

Frontend de rentals en Next.js: la aplicación que usa el negocio desde el celular (consultar disponibilidad,
armar el presupuesto, la hoja del fin de semana, la devolución) y el sitio público (landing y links de
presupuesto que se comparten por WhatsApp).

**Las reglas de negocio viven en `rentals-be`.** Este repo no calcula disponibilidad, estados ni montos: los pide a
la API y los muestra. El vocabulario es el de `../rentals-be/GLOSSARY.md`.

## Stack

- Next.js (App Router) + TypeScript. Versión y librerías de UI: **pendiente** del scaffolding.
- Datos: cliente tipado generado desde el OpenAPI de `rentals-be`. Nunca tipos escritos a mano para la API.
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

Todavía no hay código. La estructura objetivo (detalle en `docs/architecture.md` §2):

```text
src/
├── app/                  rutas finas: (publico), p/[token], (app), (admin), api/[...path], (dev)/gallery
├── features/<feature>/   components/, hooks/, api/, types.ts, index.ts
├── api/                  cliente generado del OpenAPI, server.ts (solo servidor), QueryClient
├── components/ui/        shadcn/ui, sin lógica de negocio
└── lib/                  format/ (plata y fechas), effects/ (los únicos useEffect)
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

- Máximo **400 líneas de lógica de producción** por PR (tests, cliente generado y estilos no cuentan).
- Un solo foco por PR.
- Toda PR enlaza su ticket como `Enzo-cam/rentals-be#N`.

## Agent skills

### Issue tracker

Los tickets viven en `Enzo-cam/rentals-be`, no en este repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Las cinco etiquetas por defecto, gestionadas en `rentals-be`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, con el glosario en `rentals-be`. See `docs/agents/domain.md`.
