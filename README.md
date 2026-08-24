# HabitQuest ⚔️

Convierte tus hábitos en una aventura RPG. Sube de nivel con XP, mantén rachas, desbloquea logros y reta a tus amigos con **retos de metas** y apuestas simbólicas con impacto real.

## Stack

- **Astro 7** (SSR) + **React islands** (UI del juego)
- **Tailwind CSS v4**
- **Drizzle ORM** + **Neon** (Postgres serverless)
- **Despliegue**: Vercel (`@astrojs/vercel`)

## Funcionalidades

- **Hábitos**: CRUD con emoji, frecuencia (diaria/semanal), dificultad y recordatorio por hora.
- **Check-ins**: registro diario, rachas, vidas y cálculo de XP.
- **Gamificación RPG**: niveles con curva de XP, vidas, logros desbloqueables.
- **Retos con amigos**: crea un reto con meta + plazo + **apuesta real** ("el perdedor invita el café"), comparte el código, y al vencer se declara ganador. El ganador marca la apuesta como cumplida y el perdedor la confirma.
- **Notificaciones**: recordatorios por hábito (Web Notifications) y notificaciones in-app de logros y retos.
- **i18n**: interfaz en español e inglés.

## Puesta en marcha

1. Instala dependencias: `npm install`
2. Copia `.env.example` a `.env` y completa:
   - `DATABASE_URL` — cadena de Neon.
   - `AUTH_SECRET` — genera una con `openssl rand -base64 32`.
3. Aplica las migraciones: `npm run db:migrate`
4. Arranca el dev server: `npm run dev`

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Dev server (SSR) |
| `npm run build` | Build SSR para Vercel |
| `npm run db:generate` | Genera migraciones desde el schema |
| `npm run db:migrate` | Aplica migraciones a Neon |
| `npm test` | Tests del motor de gamificación |
| `npx tsc --noEmit` | Chequeo de tipos |

## Despliegue en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel (framework: Astro, detecta el adapter automáticamente).
3. Define `DATABASE_URL` y `AUTH_SECRET` en Project Settings → Environment Variables.
4. `npm run db:migrate` contra la base de producción (puedes correrlo localmente apuntando a la misma `DATABASE_URL`).

## Estructura

```
src/
  pages/api/     # API (auth, hábitos, retos, notificaciones)
  pages/*.astro  # landing, login, register, app
  components/
    app/         # UI React del juego (islas)
    AuthPage.tsx # formularios de login/registro
  db/            # schema Drizzle + cliente Neon
  lib/
    game.ts      # motor puro de gamificación (XP, rachas, retos)
    engine.ts    # lógica de hábitos sobre la DB
    retos.ts     # lógica de retos
    auth.ts      # sesiones JWT + hashing
    i18n.ts      # diccionarios ES/EN
  middleware.ts  # protección de rutas
tests/           # tests de Vitest
drizzle/         # migraciones SQL
```