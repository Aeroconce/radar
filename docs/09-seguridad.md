# 09 — Seguridad (RF-12, RF-13)

- **Autenticación**: Better Auth con correo y contraseña; contraseñas de 12 caracteres mínimo; hash de la librería (scrypt/argon2 según versión); bloqueo tras 5 intentos fallidos por 15 minutos; cierre de sesión por inactividad (`SESSION_IDLE_MINUTES`, 60). Sin registro público: los usuarios los crea el Administrador.
- **Autorización**: en Server Actions y Route Handlers, siempre en el servidor. Revisor no accede a Reglas, Configuración ni Auditoría. La interfaz oculta; el servidor niega.
- **Archivos**: verificación de tipo por contenido, tamaño máximo 50 MB, nombre aleatorio en disco, `storage/` fuera de `public/`, descarga por Route Handler con sesión, protección contra path traversal.
- **Entrada**: zod en toda acción y ruta; Prisma parametrizado.
- **Cabeceras**: `next.config.ts` con CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`; HSTS en nginx.
- **Secretos**: solo en `.env`; el ticket de Mercado Público nunca llega al navegador ni a los logs; rotarlo si se filtra.
- **Auditoría**: inicio y cierre de sesión (con fallos), creación de revisiones, subida y eliminación de adjuntos, cambios de reglas, usuarios y configuración; usuario, fecha, IP, detalle legible.
- **Excepción pública**: `/api/health` (RF-14) responde sin sesión, porque lo consulta el monitoreo externo (`docs/10`). Devuelve solo estado, conectividad de la base y la marca de tiempo del último barrido; nunca datos de licitaciones, usuarios ni configuración.
- **Bloqueo por intentos**: los 5 intentos fallidos y los 15 minutos de espera se configuran en Better Auth (`src/lib/auth.ts`), que lleva el conteo en sus propias tablas; no hay modelo propio para esto.
- **Datos**: la información de licitaciones es pública; las notas son internas de la empresa y se tratan como confidenciales. Respaldo diario (`docs/10`).
