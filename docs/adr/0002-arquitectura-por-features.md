---
status: accepted
date: 2026-10-20
---

# Arquitectura por features, mínimo estado y Playwright como herramienta principal de tests

El frontend se organiza por feature (componentes, hooks, llamadas a la API y tipos de UI juntos) y separa el
estado por dueño: React Query para los datos del servidor, la URL para los filtros, react-hook-form para los
formularios, y `useState` solo para lo efímero de UI. `useEffect` queda encerrado en `src/lib/effects/` y prohibido
por lint en el resto. Las reglas completas están en [`docs/architecture.md`](../architecture.md), que es
obligatorio. Lo decidió el fundador el 2026-10-20.

## Decisión

- **Features** en `src/features/<feature>/`, con el nombre del glosario. Solo se importa su `index.ts`, y
  dependency-cruiser lo hace cumplir.
- **Datos:** Server Components en lo público, porque el SEO y la vista previa de WhatsApp necesitan el HTML
  completo. React Query en `(app)`. Los hooks y las query keys los escribe cada feature sobre un cliente tipado
  generado del OpenAPI. La herramienta de generación se elige en el paso 1b.
- **Sin librería de estado global.** Formularios con react-hook-form + Zod, que validan solo la forma.
- **Efectos:** `useEffect` y `useLayoutEffect` solo en `src/lib/effects/`, como hooks con nombre que sincronizan con
  un sistema externo. Una regla de ESLint lo impone (INV-FE-06).
- **Tests:**
  - Playwright para flujos, páginas (con sus chequeos de SEO) y componentes. Los componentes se testean con
    `mount()` sobre stories servidas por una galería propia (`app/(dev)/gallery`), que es el modelo estable de
    Playwright y funciona con el build de Next.js.
  - Vitest solo para funciones puras.

## Alternativas descartadas

- **Por tipo de archivo** (`components/`, `hooks/`, `services/` globales): todo lo de una funcionalidad queda
  desparramado.
- **Hooks generados desde el OpenAPI** (por ejemplo, con orval): es más rápido al principio, pero las
  invalidaciones quedan sin dueño.
- **Redux o Zustand:** con React Query y la URL no queda estado global que justifique una librería.
- **Testing Library + MSW para componentes:** testea en un DOM simulado y suma dos herramientas. Playwright testea
  en un navegador real con la misma herramienta de los flujos.
- **Los paquetes `@playwright/experimental-ct-*`:** Playwright los retiró y los reemplazó por el modelo de stories
  y galería (https://playwright.dev/docs/test-components, consultado el 2026-10-20).

## Consecuencias

- `app/(dev)/gallery` tiene que dar 404 en producción y llevar `noindex`.
- Los componentes de cliente que dependen de React Query necesitan proveedores en sus stories, con datos simulados
  por story.

## Cómo se verifica

- Paso 1b:
  - dependency-cruiser con las reglas de `architecture.md` §2.
  - La regla de ESLint contra `useEffect` y `useLayoutEffect` fuera de `src/lib/effects/`.
  - Un test de Playwright de la página del esqueleto (la que llama a `/health` de la API), con sus chequeos de
    metadata.
  - Una story con su test `mount()`.
- Cada PR del front: el checklist de `architecture.md`, aplicado por `revisor-estandares`.
