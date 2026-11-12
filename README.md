# HabitQuest

> Convierte hábitos diarios en una aventura RPG con XP, rachas, logros y retos entre amigos.

![Astro](https://img.shields.io/badge/Astro-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Neon](https://img.shields.io/badge/Neon-00E599?logo=postgresql&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

## Características

- **Cuentas:** registro e inicio de sesión con email y contraseña; hash con bcrypt y sesión JWT en cookie.
- **Hábitos:** CRUD con emoji, frecuencia diaria o semanal, días de agenda, meta semanal, recordatorio por hora y archivo.
- **Check-ins y gamificación:** XP base más bonus por racha, niveles con curva, racha actual y mejor racha.
- **Logros:** 8 logros con condiciones y recompensa de XP (primera meta, rachas de 7 y 30 días, niveles, volumen de check-ins y retos).
- **Retos:** creación con código, meta por racha o por completados, plazo y apuesta simbólica; unirse por código, progreso por check-ins y resolución al vencer con ganador.
- **Apuestas:** el ganador marca el premio como cumplido y el otro participante lo confirma.
- **Amigos:** solicitudes por email, aceptar o rechazar, y notificaciones asociadas.
- **Notificaciones:** bandeja in-app y Web Push (retos, amigos y logros).
- **Recordatorios:** endpoint `/api/cron/reminders` protegido por `CRON_SECRET` o por la cabecera de Vercel Cron.
- **Interfaz:** tablero, hábitos, retos, amigos, logros y perfil, con soporte español/inglés.
- **PWA:** manifest y service worker para instalar la app en el teléfono.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Astro 7 en modo SSR con adapter de Vercel |
| UI | React 19 como islas |
| Estilos | Tailwind CSS 4 y `lucide-react` |
| Base de datos | Neon (Postgres serverless) con Drizzle ORM |
| Autenticación | `jose` para JWT y `bcryptjs` para contraseñas |
| Notificaciones | Web Push con `web-push` |
| Validación | Zod |
| Tests | Vitest sobre el motor puro de gamificación |
| Deploy | Vercel |

## Estructura del proyecto

```text
src/
  pages/
    api/            auth, hábitos, retos, amigos, notificaciones y cron
    app/            tablero, hábitos, retos, amigos, logros y perfil
    index/login/register
  components/app/   UI React del juego y sus vistas
  db/               schema Drizzle y cliente Neon
  lib/
    game.ts         motor puro: XP, niveles, rachas, logros, retos
    engine.ts       lógica de hábitos sobre la base
    retos.ts        progreso y cierre de retos
    auth.ts         sesiones y hashing
    push.ts         envío de notificaciones push
    i18n.ts         diccionarios ES/EN
  middleware.ts     protege /app
drizzle/            migraciones SQL
tests/              suite de Vitest
```

## Puesta en marcha

### Requisitos

- Node.js 22.12 o superior (definido en `engines`).
- Una base de datos Neon y, para push, un par de claves VAPID.

### Instalación

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

### Variables de entorno

| Variable | Uso | Obligatoria |
| --- | --- | --- |
| `DATABASE_URL` | Cadena de conexión a Neon | Sí |
| `AUTH_SECRET` | Firma de las sesiones JWT | Sí |
| `PUBLIC_VAPID_PUBLIC_KEY` | Clave pública de Web Push | Para push |
| `VAPID_PRIVATE_KEY` | Clave privada de Web Push | Para push |
| `VAPID_SUBJECT` | Contacto del emisor VAPID | Para push |
| `CRON_SECRET` | Autoriza el cron de recordatorios | Para recordatorios |

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo SSR |
| `npm run build` | Build de producción con adapter de Vercel |
| `npm run preview` | Sirve el build generado |
| `npm run astro` | Acceso directo al CLI de Astro |
| `npm run db:generate` | Genera migraciones desde el schema |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:studio` | Abre Drizzle Studio |
| `npm run test` | Tests del motor de gamificación |

## Despliegue

Se despliega en Vercel con el adapter de Astro. Hay que definir las variables de entorno
del proyecto, aplicar migraciones contra la base de producción y programar un cron que
llame a `/api/cron/reminders`. Para recibir push con la app cerrada, el service worker y
las claves VAPID deben estar configurados.

## Estado del proyecto

Aplicación completa en desarrollo activo: cubre autenticación, hábitos, gamificación,
retos, amigos y notificaciones. Los tests se concentran en el motor puro de gamificación.

## Licencia

Sin licencia definida.

## Autor

Marcos Zingaretti — https://github.com/marcoszinga94
