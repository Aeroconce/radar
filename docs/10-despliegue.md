# 10 — Despliegue

Servidor de Aeroconce (`srv1431253`, Ubuntu 24.04), compartido con otros ocho sitios.
Por eso el Radar corre aislado: **usuario propio, puerto propio, base propia y unidades systemd propias**.
No toques la configuración global de nginx ni el PostgreSQL de otros proyectos.

## Lo que ya está aprovisionado

| | |
|---|---|
| Acceso | `ssh vps` (alias en `~/.ssh/config`) |
| Usuario del sistema | `radar` (uid 1005) |
| Directorio | `/home/radar/app` |
| Puerto interno | 3050 |
| Base de datos | PostgreSQL 16, rol y base `radar` |
| nginx | `/etc/nginx/sites-available/radar.aeroconce.cl` → `127.0.0.1:3050`, `client_max_body_size 60m` (RF-07: 50 MB por archivo) |
| TLS | Let's Encrypt vía certbot `--nginx`, renovación automática |
| Node | **22.23.2**, instalado solo para el usuario `radar` en `/home/radar/.local/node`. El del sistema sigue en 20.20.0 porque lo usan otros cuatro servicios |
| Repositorio | `/home/radar/radar.git`, bare. Se despliega con `git push vps master` |

## Node y pnpm: por qué hay una instalación aparte

**pnpm 11 no corre en Node 20.** Necesita `node:sqlite`, que existe recién desde Node 22. El error que da
es `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`, y por corepack aparece disfrazado de
`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`, que manda a buscar el problema al lugar equivocado.

El VPS es compartido: cuatro servicios de otros proyectos corren sobre el Node 20 del sistema. Así que
**Node 22 se instala solo para el usuario `radar`** y el del sistema no se toca.

```bash
# Node 22 LTS aislado, verificando la firma contra nodejs.org
VER=v22.23.2; ARCH=linux-x64
cd /tmp && curl -fsSLO https://nodejs.org/dist/$VER/node-$VER-$ARCH.tar.xz
curl -fsSLO https://nodejs.org/dist/$VER/SHASUMS256.txt
grep " node-$VER-$ARCH.tar.xz$" SHASUMS256.txt | sha256sum -c -
tar -xJf node-$VER-$ARCH.tar.xz && mv node-$VER-$ARCH /home/radar/.local/node
chown -R radar:radar /home/radar/.local/node

# pnpm en la version exacta del packageManager, con ese Node
echo 'export PATH="/home/radar/.local/node/bin:/home/radar/.local/node_modules/.bin:$PATH"' >> /home/radar/.profile
sudo -u radar -i bash -lc 'npm install --prefix /home/radar/.local pnpm@11.18.0'
```

> No se usa `curl | sh` del instalador de pnpm: `npm install` con la versión pineada del `packageManager`
> hace lo mismo sin ejecutar un script descargado.

**Variables.** `/home/radar/app/.env`, propiedad de `radar`, permisos `600`. La referencia es
`.env.example`; todas son obligatorias (`docs/01`).

> El archivo debe tener **finales de línea LF**. Creado desde Windows queda con CRLF, y aunque systemd
> los normaliza, no todas las herramientas lo hacen: un `` al final del ticket rompe las llamadas a la
> API sin decir por qué.

## Despliegue

El servidor tiene un repositorio bare en `/home/radar/radar.git`. Su hook de recepción deja los archivos
en `/home/radar/app` y **no hace nada más**: no instala, no compila y no reinicia. Un hook que reinicia
solo puede tumbar producción con un push a medio terminar, así que el despliegue es deliberado.

Desde tu máquina, con el remoto `vps` configurado (`git remote add vps radar:/home/radar/radar.git`):

```bash
git push vps master
ssh vps 'sudo -u radar -i bash -lc "cd app && pnpm install --frozen-lockfile && pnpm prisma migrate deploy && pnpm build"'
ssh vps 'systemctl restart radar radar-worker'
ssh vps 'systemctl status radar radar-worker --no-pager'
```

El alias `radar` de `~/.ssh/config` apunta al usuario del proyecto, no a root: así los archivos quedan
con el propietario correcto sin tener que hacer `chown` después.

La primera vez, además: `pnpm seed` para cargar los datos de agosto de 2026 (`docs/11`).

## Unidades systemd

Dos procesos, como manda RN-06. `radar.service` ya existe; `radar-worker.service` hay que crearlo.

`/etc/systemd/system/radar.service` — web:

```ini
[Unit]
Description=Radar de Licitaciones (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=radar
WorkingDirectory=/home/radar/app
EnvironmentFile=/home/radar/app/.env
ExecStart=/home/radar/.local/node/bin/node node_modules/next/dist/bin/next start -p 3050
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/radar-worker.service` — worker con cron. Ojo con `Environment=PATH`: sin eso el
servicio tomaría el Node 20 del sistema y pnpm fallaría:

```ini
[Unit]
Description=Radar de Licitaciones - worker
After=network.target postgresql.service radar.service

[Service]
Type=simple
User=radar
WorkingDirectory=/home/radar/app
EnvironmentFile=/home/radar/app/.env
ExecStart=/home/radar/.local/node_modules/.bin/pnpm worker
Restart=always
RestartSec=15
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/home/radar/app/storage

[Install]
WantedBy=multi-user.target
```

Tras crearlas o editarlas: `systemctl daemon-reload && systemctl enable --now radar radar-worker`.

> `EnvironmentFile` de systemd no expande variables ni ejecuta el shell. Los valores con espacios van
> entre comillas dobles, que es como está escrito `.env`.

## Vuelta atrás

Si un despliegue rompe producción:

```bash
sudo -u radar -i
cd /home/radar/app
git reset --hard <commit anterior>
pnpm install --frozen-lockfile && pnpm build
exit
systemctl restart radar radar-worker
```

Las migraciones **no se revierten solas**. Si el problema es de base, restaura el respaldo de la noche
anterior antes de volver el código atrás; una migración aplicada con código viejo deja la base delante
del schema que el código espera.

## Operación

- **Respaldo** diario 03:00 por cron: `pg_dump -Fc radar > /srv/backups/radar-$(date +%F).dump` más un
  `tar` de `storage/`. Rotación de 14 días. Ensayar una restauración completa al menos una vez.
- **Monitoreo**: Uptime Kuma contra `https://radar.aeroconce.cl/api/health`, que responde
  `{ status, database, lastSweep: { at, ok, created } }`. Alerta si el último barrido tiene más de 6 horas.
- **Logs**: `journalctl -u radar-worker -f` (JSON de pino). Para la web, `journalctl -u radar -f`.
- **Certificado**: certbot lo renueva solo. Verificar con `certbot certificates`.

## Si algo falla

| Síntoma | Dónde mirar |
|---|---|
| 502 en el dominio | `systemctl status radar` — el proceso no está escuchando en 3050 |
| 413 al subir un adjunto | `client_max_body_size` en el sitio de nginx; debe ser ≥ 60m |
| El barrido no corre | `journalctl -u radar-worker`; revisar `JobRun` y la cuota del ticket (`docs/03`) |
| No llegan correos | `Notification` con `status = FAILED` y su columna `error` (`docs/08`) |
