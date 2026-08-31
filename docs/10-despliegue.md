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
| Node | 20.20.0 (Next 16 exige ≥ 20.9; subir a 22 LTS está pendiente, T-07) |

## Antes del primer despliegue

**pnpm.** El `pnpm` del servidor es un shim de corepack que falla con `ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING`
bajo Node 20. Instálalo standalone solo para el usuario `radar`, sin tocar el corepack global que usan
los otros proyectos:

```bash
sudo -u radar bash -lc 'curl -fsSL https://get.pnpm.io/install.sh | SHELL=bash sh -'
```

**Variables.** `/home/radar/app/.env`, propiedad de `radar`, permisos `600`. La referencia es
`.env.example`; todas son obligatorias (`docs/01`).

## Despliegue

```bash
ssh vps
sudo -u radar -i
cd /home/radar/app

git pull                                  # la primera vez: git clone <repo> .
pnpm install --frozen-lockfile            # postinstall ejecuta prisma generate
pnpm prisma migrate deploy
pnpm build
exit

systemctl restart radar radar-worker
systemctl status radar radar-worker --no-pager
```

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
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3050
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/radar-worker.service` — worker con cron:

```ini
[Unit]
Description=Radar de Licitaciones - worker
After=network.target postgresql.service radar.service

[Service]
Type=simple
User=radar
WorkingDirectory=/home/radar/app
EnvironmentFile=/home/radar/app/.env
ExecStart=/home/radar/.local/share/pnpm/pnpm worker
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
