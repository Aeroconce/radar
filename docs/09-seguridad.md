# 09 — Seguridad (RF-12, RF-13)

- **Autenticación**: Better Auth con correo y contraseña; mínimo 12 caracteres; el hash lo calcula la
  librería. Cierre por inactividad: la sesión dura `SESSION_IDLE_MINUTES` y se renueva en cada petición,
  así que el reloj cuenta desde el último uso.
- **Casilla «mantener la sesión iniciada»**, marcada por defecto. Marcada, la cookie dura los
  `SESSION_IDLE_MINUTES` completos (**30 días**). Sin marcar, Better Auth deja la cookie sin `maxAge`, así
  que muere al cerrar el navegador, y limita la sesión en base a un día: es la opción para un equipo prestado.

  > El plan original eran **60 minutos** de inactividad. Se subió a 30 días a pedido del equipo, que entra
  > unas pocas veces por semana y estaba reingresando la clave en cada visita. Es una relajación consciente
  > sobre una cuenta compartida: si el riesgo cambia, se baja el número y basta con reiniciar el servicio. **Sin registro público** (`disableSignUp`), comprobado.
- **Una sola cuenta, compartida por el equipo** (D-22). No da atribución por sesión, así que **el autor de
  cada nota se elige al guardar la revisión** y queda en `Review.authorName`. Se elige de una lista
  configurable, no en texto libre: «Fran», «Francisco» y «francisco» quedarían como tres personas y el
  filtro por autor dejaría de servir.
- **La bitácora no puede distinguir quién inició sesión ni quién cambió una regla**, porque la cuenta es
  una sola. Es el costo aceptado de D-22; el modelo ya soporta cuentas individuales (`docs/12` T-17).
- **Autorización**: en Server Actions y Route Handlers, siempre en el servidor. `src/proxy.ts` — que en
  Next 16 reemplaza a `middleware` — solo comprueba que exista la cookie, porque puede desplegarse en un
  CDN y no debe tocar la base. La validación real es `requireSession()`. Revisor no accede a Reglas, Configuración ni Auditoría. La interfaz oculta; el servidor niega.
- **Archivos**: verificación de tipo por contenido, tamaño máximo 50 MB, nombre aleatorio en disco, `storage/` fuera de `public/`, descarga por Route Handler con sesión, protección contra path traversal.
- **Entrada**: zod en toda acción y ruta; Prisma parametrizado.
- **Cabeceras**: `next.config.ts` con CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`; HSTS en nginx.
- **Secretos**: solo en `.env`; el ticket de Mercado Público nunca llega al navegador ni a los logs; rotarlo si se filtra.
- **Auditoría**: inicio y cierre de sesión (con fallos), creación de revisiones, subida y eliminación de adjuntos, cambios de reglas, usuarios y configuración; usuario, fecha, IP, detalle legible.
- **Bloqueo por intentos**: los 5 intentos fallidos y los 15 minutos de espera se configuran en Better Auth (`src/lib/auth.ts`), que lleva el conteo en sus propias tablas; no hay modelo propio para esto.
- **Datos**: la información de licitaciones es pública; las notas son internas de la empresa y se tratan como confidenciales. Respaldo diario (`docs/10`).
