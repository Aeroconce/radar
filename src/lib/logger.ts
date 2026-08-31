/**
 * Registro estructurado del worker (docs/05).
 *
 * JSON, para que `journalctl -u radar-worker` sea consultable (docs/10).
 * El ticket de la API nunca sale por aqui: `redact` lo tapa aunque alguien lo
 * pase por descuido dentro de un objeto de contexto (docs/09).
 */
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["ticket", "*.ticket", "MP_API_TICKET", "*.MP_API_TICKET", "url", "*.url"],
    censor: "[oculto]",
  },
  base: undefined, // sin pid ni hostname: el journal ya los registra
});

/** Un hijo con el nombre de la tarea, para filtrar por trabajo en el journal. */
export function jobLogger(job: string) {
  return logger.child({ job });
}
