# 01 — Arquitectura y stack

## Componentes
| Componente | Tecnología | Notas |
|---|---|---|
| Web | Next.js 16.3.3, App Router, React 19, TypeScript | Interfaz, Route Handlers (`/api/*`), Server Actions para formularios |
| Estilos | Tailwind CSS 4 + shadcn/ui | Tabla, filtros, diálogo, formulario, badge, toast |
| Datos | PostgreSQL 16 + Prisma 7.10 | Un schema, migraciones versionadas. La definición está en `prisma/schema.prisma`; el porqué, en `docs/02` |
| Autenticación | Better Auth (email y contraseña) | Sesiones en base de datos; roles en la tabla `User` |
| Worker | Node 20.20.0 + node-cron, TypeScript ejecutado con `tsx` | Proceso separado; comparte `prisma/` y `src/lib/` |
| Archivos | Disco del servidor (`storage/attachments/`) | Servidos por Route Handler con verificación de sesión |
| Notificaciones | Correo vía Resend | Canal único; dominio `radar.aeroconce.cl` verificado (`sa-east-1`) |
| Operación | systemd (`radar`, `radar-worker`), nginx (TLS con Let's Encrypt), pg_dump, Uptime Kuma | `docs/10` |

## Estructura del repositorio
```
radar-licitaciones/
  src/
    app/
      (auth)/login/page.tsx
      (app)/layout.tsx                 # barra superior + navegación
      (app)/page.tsx                   # tablero (RF-04)
      (app)/licitaciones/[id]/page.tsx # ficha (RF-05, RF-06, RF-07)
      (app)/historico/page.tsx         # RF-08
      (app)/reglas/page.tsx            # RF-09 (Administrador)
      (app)/configuracion/page.tsx     # usuarios, notificaciones (Administrador)
      (app)/auditoria/page.tsx         # RF-13
      api/health/route.ts              # RF-14
      api/attachments/[id]/route.ts    # descarga con sesión
      api/export/route.ts              # RF-11
      api/auth/[...all]/route.ts       # Better Auth
    components/                        # ui (shadcn) + componentes propios
    lib/
      db.ts                            # PrismaClient único
      auth.ts                          # Better Auth
      mp/client.ts                     # cliente API Mercado Público con ritmo y reintentos
      mp/parsers.ts                    # ficha, acta HTML
      affinity/rules.ts                # motor de afinidad (docs/04)
      affinity/initial-rules.ts        # reglas de partida; la semilla y las pruebas las comparten
      affinity/classify.ts             # vertical, tipo de comprador, señales
      notifications/email.ts           # plantillas y entrega via Resend
      notifications/dispatch.ts        # la cola de avisos y sus reintentos
      env.ts                           # valida las variables con zod al arrancar
      logger.ts                        # pino en JSON, con el ticket tapado
      settings.ts                      # umbral y reglas leidos de la base (RF-09)
      format.ts                        # fechas y montos en español neutro
    actions/                           # Server Actions (revisiones, reglas, usuarios)
  worker/
    index.ts                           # arranque de cron
    jobs/sweep.ts                      # RF-01, RF-02, RF-03
    jobs/history.ts                    # RF-08
    jobs/alerts.ts                     # RF-10
    jobs/awards.ts                     # detección de actas de licitaciones ofertadas
    run.ts                             # ejecución puntual: pnpm worker:barrido / worker:historico
  prisma/
    schema.prisma
    seed.ts                            # carga seed/
  seed/                                # datos reales (ver AGENTS.md)
  storage/attachments/                 # gitignored
  tests/                               # vitest
  docker-compose.yml                   # PostgreSQL 16 para desarrollo local
```

## Scripts de `package.json`

Ya definidos:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start -p 3000",
  "lint": "eslint",
  "test": "vitest run",
  "worker": "tsx worker/index.ts",
  "worker:barrido": "tsx worker/run.ts sweep",
  "seed": "tsx prisma/seed.ts",
  "postinstall": "prisma generate"
}
```

Pendientes, a medida que existan los archivos que invocan:

```json
{
  "worker:historico": "tsx worker/run.ts history"
}
```

`next lint` no existe en Next 16; por eso `lint` invoca `eslint` directo.

## Variables de entorno (`.env`, todas obligatorias)
```
DATABASE_URL=postgresql://radar:***@localhost:5435/radar?schema=public   # local (docker-compose); en el servidor, 5432
BETTER_AUTH_SECRET=<64 hex>
BETTER_AUTH_URL=https://radar.aeroconce.cl
MP_API_TICKET=<ticket propio de la API pública>
MP_MIN_INTERVAL_MS=3500
RESEND_API_KEY=<clave de Resend>
RESEND_FROM="Radar de Licitaciones <notificaciones@radar.aeroconce.cl>"
RESEND_REPLY_TO=<casilla real: el dominio del radar no recibe correo>
NOTIFY_TO=<destinatarios separados por coma>
STORAGE_DIR=./storage
SESSION_IDLE_MINUTES=60

# Solo para `pnpm seed`, que crea el administrador inicial (docs/11)
SEED_ADMIN_EMAIL=<correo del administrador>
SEED_ADMIN_PASSWORD=<contraseña inicial>
```
`src/lib/env.ts` valida con zod al arrancar; falla si falta una variable.

## Convenciones
- Fechas en base de datos en UTC; en interfaz en hora de Chile (`America/Santiago`), formato `dd-mm-aaaa hh:mm`.
- Montos como `Decimal` en pesos; moneda registrada aparte (`CLP`, `CLF`, `USD`).
- Las respuestas de la API se guardan íntegras en `Tender.raw` (JSON) además de los campos normalizados: si mañana hace falta un campo nuevo, no se vuelve a consultar.
- Todo lo que el worker hace queda en `JobRun` (inicio, fin, resultado, conteos, error).
