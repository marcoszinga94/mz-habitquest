# HabitQuest — convenciones del proyecto

Stack: **Astro 7 (SSR) + React islands + Tailwind v4 + Drizzle + Neon (Postgres serverless)**, desplegado en Vercel con `@astrojs/vercel`.

## Development

El dev server corre en background:

```
npm run dev -- --background
```

Gestionar con `astro dev stop`, `astro dev status`, `astro dev logs`.

## Base de datos (Neon)

- `npm run db:generate` — genera migraciones SQL en `drizzle/` desde `src/db/schema.ts`.
- `npm run db:migrate` — aplica migraciones pendientes (usa `DATABASE_URL` de `.env`).
- El cliente Drizzle lee `DATABASE_URL` vía `import.meta.env` o `process.env` (`src/db/index.ts`).

## Variables de entorno

Copia `.env.example` a `.env` con tu `DATABASE_URL` de Neon y un `AUTH_SECRET` (`openssl rand -base64 32`). En Vercel define ambas en Project Settings → Environment Variables.

## Estructura

- `src/pages/api/*` — endpoints (API routes de Astro). Rutas anidadas (`[id]/checkin.ts`) requieren imports con un nivel más de profundidad.
- `src/lib/game.ts` — motor puro de gamificación (XP, niveles, rachas, logros, resolución de retos). **No importa la base de datos.**
- `src/lib/engine.ts` — lógica de negocio de hábitos sobre la DB (usa `game.ts`).
- `src/lib/retos.ts` — lógica de retos (progreso, finalización, apuestas).
- `src/db/schema.ts` — schema Drizzle de todas las tablas.
- `src/components/app/*` — la UI React del juego (isla montada en `/app`).
- `src/lib/i18n.ts` — diccionarios ES/EN compartidos entre cliente y servidor.
- `src/middleware.ts` — protege `/app` y redirige sesiones ya iniciadas.

## Convenciones

- **Sin Next.js** (por decisión del usuario). Astro SSR + React islands.
- Los POST al API deben enviar `Content-Type: application/json` (el cliente `api.ts` ya lo hace). El dev server rechaza POSTs sin ese header.
- No añadir comentarios al código salvo que se pidan.
- i18n: toda cadena de UI va en `src/lib/i18n.ts` y se accede con el hook `useI18n().t()`.

## Verificación

- `npm test` — tests de Vitest del motor de gamificación (`tests/game.test.ts`).
- `npm run build` — build SSR con el adapter de Vercel.
- `npx tsc --noEmit` — chequeo de tipos.

## Documentación

- Astro: https://docs.astro.build (endpoints: `/en/guides/endpoints/`)
- Drizzle + Neon: https://orm.drizzle.team/docs/get-started-postgresql
- Adapter Vercel: https://docs.astro.build/en/guides/integrations-guide/vercel/