# Radar de Licitaciones

Herramienta interna de **Aeroconce Servicios SpA** para encontrar, ordenar y registrar
licitaciones públicas de Mercado Público relacionadas con el perfil de la empresa.

El sistema busca y ordena; las personas descargan las bases, las leen y dejan una nota
de por qué sí o por qué no. No calcula probabilidades ni emite veredictos.

## Stack

| Capa | Tecnología |
|---|---|
| Web | Next.js 16 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 · shadcn/ui |
| Datos | Prisma 7 · PostgreSQL 16 |
| Sesión | Better Auth |
| Worker | Node + node-cron (proceso aparte, mismo repositorio) |
| Notificaciones | Correo vía Resend (canal único) |
| Servidor | systemd + nginx en el VPS de Aeroconce |

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
docker compose up -d          # PostgreSQL 16 en 127.0.0.1:5435
pnpm prisma migrate dev
pnpm dev
```

La aplicación queda en `http://localhost:3000`.

Completa las variables de `.env` antes de arrancar: todas son obligatorias y están documentadas
en `docs/01`. El `DATABASE_URL` que trae `.env.example` ya apunta al contenedor.

> El contenedor escucha en el **5435**, no en el 5432: entrega PostgreSQL 16.15, la misma versión
> exacta del servidor, pero el 5432 suele estar tomado por otras instalaciones.

## Estructura

```
docs/          Especificación funcional y técnica (leer primero)
referencia/    Prototipos Python que ya funcionaron; referencia para portar a TS
seed/          Datos reales capturados con la API en agosto de 2026
prisma/        Schema y migraciones
docker-compose.yml  PostgreSQL 16 para desarrollo local
src/app/       Rutas del App Router
src/components/ui/  shadcn
src/lib/       Cliente Prisma, entorno, registro, cliente de Mercado Público, afinidad
worker/        Proceso aparte con cron: barrido, histórico, avisos
tests/         vitest
storage/       Adjuntos descargados en runtime (fuera de git)
```

## Documentación

Se lee en orden. La guía de trabajo para agentes está en `AGENTS.md`.

| # | Documento |
|---|---|
| 00 | [Alcance y requisitos](docs/00-alcance-y-requisitos.md) |
| 01 | [Arquitectura y stack](docs/01-arquitectura-y-stack.md) |
| 02 | [Modelo de datos](docs/02-modelo-de-datos.md) |
| 03 | [API de Mercado Público](docs/03-api-mercado-publico.md) |
| 04 | [Motor de afinidad](docs/04-motor-de-afinidad.md) |
| 05 | [Worker](docs/05-worker.md) |
| 06 | [Interfaz](docs/06-interfaz.md) |
| 07 | [Revisiones](docs/07-revisiones.md) |
| 08 | [Notificaciones](docs/08-notificaciones.md) |
| 09 | [Seguridad](docs/09-seguridad.md) |
| 10 | [Despliegue](docs/10-despliegue.md) |
| 11 | [Pruebas y semilla](docs/11-pruebas-y-semilla.md) |
| 12 | [Decisiones y pendientes](docs/12-decisiones-y-pendientes.md) |

## Convenciones

- **pnpm** para todo. No usar npm ni yarn.
- Identificadores en inglés; interfaz, mensajes y documentación en español neutro.
- Cada comportamiento implementado lleva su identificador de requisito (`RF-xx`, `RN-xx`) de `docs/00`.
- Commits en español con el identificador: `feat(tablero): filtros por estado y vertical (RF-05)`.
- Nunca se guardan credenciales en el repositorio.

---

Software interno. Todos los derechos reservados, Aeroconce Servicios SpA.
