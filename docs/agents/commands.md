# Comandos

Los agentes corren **exactamente** estos comandos, desde la raíz del repo. Cada uno sale con 0 sobre `main`.

| Para | Comando | Notas |
|---|---|---|
| Instalar | `pnpm install` | `pnpm`, no `npm`. En CI: `pnpm install --frozen-lockfile` |
| Typecheck | `pnpm typecheck` | `next typegen && tsc --noEmit`. Sin errores |
| Lint (solo medir) | `pnpm lint` | **Sin `--fix`**. Incluye la regla de INV-FE-06 |
| Formato (solo medir) | `pnpm format:check` | Prettier en modo check; no revisa `*.md`, el cliente generado ni `components/ui` |
| Reglas de imports | `pnpm depcruise` | dependency-cruiser con las reglas de `docs/architecture.md` §2 |
| Un archivo de test unitario | `pnpm exec vitest run src/api/proxy-rules.test.ts` | Vitest, solo funciones puras |
| Tests unitarios | `pnpm test:unit` | Vitest con 1 worker |
| Build | `pnpm build` | Verifica que las páginas públicas se rendericen en el servidor |
| Valores sensibles en el cliente | `pnpm check:client-env` | Después de `pnpm build`. AC-9 / INV-FE-04 |
| E2E (360 px) | `pnpm test:e2e` | Después de `pnpm build`. Levanta la API falsa (`127.0.0.1:4010`) y `next start` (`:3100`) |
| Suite completa | `pnpm api:check && pnpm typecheck && pnpm lint && pnpm format:check && pnpm depcruise && pnpm test:unit && pnpm build && pnpm check:client-env && pnpm test:e2e` | Una sola vez, al final. Es lo que corre CI |
| Sincronizar el contrato | `pnpm api:sync` | Copia `../rentals-be/openapi.json`, anota el commit en `src/api/openapi.source.json` y regenera `src/api/schema.d.ts` |
| Verificar el cliente generado | `pnpm api:check` | Compara `schema.d.ts` con lo que genera `openapi.json`. No necesita `rentals-be` |
| Desarrollo | `pnpm dev` | Puerto 3100 (la API usa el 3000). Variables en `.env.local` (ver `.env.example`) |
| Usuarios de prueba contra la API real | `node scripts/seed-test-users.mjs` | Con la API en `pnpm dev`. Pide la contraseña del administrador sin eco y el código de 6 dígitos de la app del celular, y escribe los links en `test-users.local.txt` (ignorado por git) |

E2E la primera vez: `pnpm exec playwright install chromium`.

## Baseline

Medido el 2026-10-21 sobre `feat/step-1b-skeleton` (Node 24.20, pnpm 11.25):

| Comando | Resultado | Tiempo |
|---|---|---|
| `pnpm api:check` | al día | 1 s |
| `pnpm typecheck` | 0 errores | 2 s |
| `pnpm lint` | 0 problemas | 2 s |
| `pnpm format:check` | todo formateado | 1 s |
| `pnpm depcruise` | 0 violaciones | 1 s |
| `pnpm test:unit` | 62 tests, 4 archivos | 1 s |
| `pnpm build` | ok | 4 s |
| `pnpm check:client-env` | ok | < 1 s |
| `pnpm test:e2e` | 27 tests | 17 s |

## Límites de recursos

- Máquina: Intel Core Ultra 7 265KF, 20 núcleos, 15,7 GB de RAM. **El límite es la memoria libre.**
- **Un worker** en Vitest (`maxWorkers: 1`) y en Playwright (`workers: 1`): la API falsa de E2E tiene estado global.
- `pnpm build`, `pnpm test:unit` y `pnpm test:e2e` siempre en secuencia, nunca a la vez.
- Nunca dos procesos de test a la vez, ni tests y lint juntos.
- **Nunca E2E mientras corren tests de `rentals-be`.** Antes de E2E, mirar la RAM libre:
  `(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB`.
