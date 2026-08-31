<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


Herramienta interna de Aeroconce Servicios SpA para **encontrar, ordenar y registrar** licitaciones públicas de Mercado Público relacionadas con el perfil de la empresa. El sistema busca y ordena; las personas descargan las bases, las leen y dejan una nota de por qué sí o por qué no. No calcula probabilidades ni emite veredictos.

## Reglas de trabajo
1. **pnpm** para todo. No usar npm ni yarn. Node **22** — en el VPS va instalado solo para el usuario `radar`, porque pnpm 11 exige `node:sqlite` y el Node del sistema sigue en 20 para los otros proyectos (`docs/10`).
2. Código en **TypeScript**, identificadores en **inglés** (convención de Next/Prisma). Textos de interfaz, mensajes y documentación en **español neutro**: sin regionalismos, sin jerga técnica visible al usuario, tuteo neutro ("Revisa", "Guarda").
3. Interfaz **simple**: una lista con búsqueda y filtros, una ficha, un formulario de revisión. Nada de paneles decorativos. Cada pantalla debe poder usarse solo con teclado.
4. Cada comportamiento implementado tiene un identificador de requisito (`RF-xx`, `RN-xx`) de `docs/00`. Lo que no tiene identificador no se construye; se anota en `docs/12`.
5. El worker respeta el ritmo de la API: nunca menos de **3,5 segundos** entre llamadas con el ticket propio, reintentos ante el código 10500 (`docs/03`).
6. Nunca se guardan credenciales en el repositorio. El ticket de Mercado Público y los secretos viven en `.env` y en el servidor.
7. Commits en español con el identificador: `feat(tablero): filtros por estado y vertical (RF-05)`.

## Stack (detalle en `docs/01`)
Next.js 16.3.3 (App Router, Route Handlers, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · Prisma 7.10 + PostgreSQL 16 · Better Auth · worker Node con node-cron (proceso separado, mismo repositorio) · nginx + systemd en el VPS (`docs/10`).

## Orden de lectura
1. `docs/00-alcance-y-requisitos.md` — qué hace el sistema y qué no; lista de requisitos.
2. `docs/01-arquitectura-y-stack.md` — estructura, comandos, variables de entorno.
3. `docs/02-modelo-de-datos.md` — invariantes y decisiones del modelo. La definición está en `prisma/schema.prisma`.
4. `docs/03-api-mercado-publico.md` — endpoints, límites, campos, actas.
5. `docs/04-motor-de-afinidad.md` — reglas de búsqueda y ordenamiento.
6. `docs/05-worker.md` — tareas programadas.
7. `docs/06-interfaz.md` — pantallas, filtros, búsqueda.
8. `docs/07-revisiones.md` — estados, motivos, notas, adjuntos.
9. `docs/08-notificaciones.md`, `docs/09-seguridad.md`, `docs/10-despliegue.md`, `docs/11-pruebas-y-semilla.md`, `docs/12-decisiones-y-pendientes.md`.

## Comandos

Los marcados con ⚠ aún no existen: falta el archivo que invocan.

```bash
pnpm install
pnpm prisma migrate dev          # desarrollo
pnpm prisma migrate deploy       # servidor
pnpm seed                        # carga seed/ (datos reales de agosto 2026)
pnpm dev                         # web en http://localhost:3000
pnpm worker                      # worker con cron (proceso aparte)
pnpm worker:barrido              # ejecuta un barrido ahora y termina
pnpm worker:refrescar            # vuelve a pedir todas las fichas guardadas
pnpm reglas:sincronizar          # deja en la base las reglas de docs/04
pnpm tablero:limpiar             # muestra que sacaria del tablero (--aplicar lo saca)
pnpm test
pnpm build && pnpm start
```

## Carpetas del paquete
- `docs/` — esta documentación.
- `seed/` — datos reales capturados la semana del 24 al 30 de agosto de 2026 con la API: 87 fichas completas, 45 adjudicaciones históricas con todos sus oferentes y precios, 356 coincidencias históricas, 899 organismos compradores. Se cargan con `pnpm seed` (`docs/11`).
- `referencia/` — scripts Python que ya funcionaron (`fetch.py`, `hist.py`, `sim.py`). Son la referencia de comportamiento para portar a TypeScript; no se ejecutan en producción.
