/**
 * Variables de entorno, validadas al arrancar (docs/01).
 *
 * Falla de inmediato y con el nombre de lo que falta, en vez de dejar que el
 * error aparezca a mitad de un barrido como un `undefined` incomprensible.
 *
 * Ninguna de estas variables puede llegar al navegador. No se usa `server-only`
 * porque el worker corre fuera de Next y ese paquete lanza al importarse ahi:
 * la garantia es no importar este modulo desde un componente de cliente.
 */
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "falta la cadena de conexion a PostgreSQL"),

  BETTER_AUTH_SECRET: z.string().min(32, "debe tener al menos 32 caracteres"),
  BETTER_AUTH_URL: z.url("debe ser una URL completa"),

  MP_API_TICKET: z.string().min(1, "falta el ticket de la API de Mercado Publico"),
  MP_MIN_INTERVAL_MS: z.coerce.number().int().positive().default(3_500),

  RESEND_API_KEY: z.string().min(1, "falta la clave de Resend"),
  RESEND_FROM: z.string().min(1, "falta el remitente de las notificaciones"),
  NOTIFY_TO: z.string().min(1, "falta al menos un destinatario"),
  // El dominio del radar tiene la recepcion deshabilitada en Resend: sin esto,
  // responder un aviso enviaria el correo a una casilla que nadie lee (docs/08).
  RESEND_REPLY_TO: z.email("debe ser un correo valido"),

  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(60),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Faltan variables de entorno o estan mal formadas.\n${detalle}\n\n` +
        "Copia .env.example a .env y completalas (docs/01).",
    );
  }

  return parsed.data;
}

export const env = load();

/** Destinatarios de las notificaciones, ya separados (docs/08). */
export function notifyRecipients(): string[] {
  return env.NOTIFY_TO.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
