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
- **Web Push**: notificaciones push en el teléfono (retos ganados/perdidos, solicitudes de amistad) y recordatorios de hábitos mediante cron.
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
4. Para **notificaciones push** define también:
   - `PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` (generadas con `npx web-push generate-vapid-keys --json`)
   - `CRON_SECRET` (protege el cron de recordatorios)
5. `npm run db:migrate` contra la base de producción (puedes correrlo localmente apuntando a la misma `DATABASE_URL`).

## Notificaciones en el teléfono

- Los recordatorios mientras la app está abierta usan Web Notifications.
- Para recibir notificaciones **con la app cerrada** se usa Web Push (VAPID + service worker).
- **Android**: funciona en el navegador; activa "Recordatorios" en el tablero.
- **iPhone**: es necesario **instalar la app** (Compartir → Añadir a pantalla de inicio) para que Safari permita push (requisito de iOS 16.4+).
- Los eventos de retos y amigos se notifican al instante. Los recordatorios de hábitos se envían vía el endpoint `/api/cron/reminders` (protegido con `CRON_SECRET`); su frecuencia depende del plan de Vercel (los cron frecuentes requieren plan Pro).

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