/**
 * Entorno de las pruebas.
 *
 * `src/lib/env.ts` valida al importarse y falla si falta una variable, que es lo
 * correcto en produccion pero deja sin poder importar a cualquier modulo que lo use.
 *
 * Aqui se rellena lo que falte con valores de prueba, **sin pisar** lo que ya venga
 * del entorno. Asi la suite corre igual en una maquina sin `.env` que en CI, y
 * ninguna prueba depende de credenciales reales.
 */
const DEFAULTS: Record<string, string> = {
  DATABASE_URL: "postgresql://radar:radar_dev@localhost:5435/radar_test?schema=public",
  BETTER_AUTH_SECRET: "0".repeat(64),
  BETTER_AUTH_URL: "https://radar.aeroconce.cl",
  MP_API_TICKET: "TICKET-DE-PRUEBA",
  MP_MIN_INTERVAL_MS: "3500",
  RESEND_API_KEY: "clave-de-prueba",
  RESEND_FROM: "Radar de Licitaciones <notificaciones@radar.aeroconce.cl>",
  NOTIFY_TO: "pruebas@example.com",
  RESEND_REPLY_TO: "pruebas@example.com",
  STORAGE_DIR: "./storage",
  SESSION_IDLE_MINUTES: "60",
};

for (const [key, value] of Object.entries(DEFAULTS)) {
  process.env[key] ??= value;
}
