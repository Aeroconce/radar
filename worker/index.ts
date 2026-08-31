/**
 * Worker del Radar (docs/05).
 *
 * Proceso aparte del web, mismo repositorio y misma base. Corre como
 * `radar-worker.service` en el servidor (docs/10).
 *
 * Las horas son de Chile. `node-cron` corre en UTC si no se le dice la zona, y
 * Chile cambia de huso dos veces al ano: sin `timezone` el resumen de las 08:00
 * se correria una hora durante medio ano.
 */
import "dotenv/config";
import cron from "node-cron";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { MpClient } from "@/lib/mp/client";
import { alerts } from "./jobs/alerts";
import { sweep } from "./jobs/sweep";

export const TIMEZONE = "America/Santiago";

/** Horarios de docs/05. Los que aun no tienen tarea quedan anotados, no agendados. */
const SCHEDULE = {
  sweep: "15 */2 * * *",
  history: "0 4 * * *",
  awards: "0 6 * * *",
  alerts: "0 8 * * *",
  cleanup: "0 3 * * 0",
} as const;

const PENDING: Array<keyof typeof SCHEDULE> = ["history", "awards", "cleanup"];

export function createClient(): MpClient {
  return new MpClient({
    ticket: env.MP_API_TICKET,
    minIntervalMs: env.MP_MIN_INTERVAL_MS,
  });
}

function main(): void {
  logger.info({ zona: TIMEZONE, barrido: SCHEDULE.sweep }, "worker iniciado");
  logger.warn({ pendientes: PENDING }, "tareas aun no implementadas; no quedan agendadas");

  cron.schedule(
    SCHEDULE.sweep,
    async () => {
      // Un cliente nuevo por ciclo: los contadores de llamadas y reintentos
      // pertenecen a ese barrido y van a su JobRun.
      try {
        await sweep({ client: createClient() });
      } catch (e) {
        // Ya quedo registrado en JobRun; aqui solo se evita que tumbe el proceso.
        logger.error({ err: String(e) }, "el barrido termino con error");
      }
    },
    { timezone: TIMEZONE },
  );

  cron.schedule(
    SCHEDULE.alerts,
    async () => {
      try {
        await alerts();
      } catch (e) {
        logger.error({ err: String(e) }, "los avisos de la manana terminaron con error");
      }
    },
    { timezone: TIMEZONE },
  );

  const apagar = (senal: string) => {
    logger.info({ senal }, "worker detenido");
    process.exit(0);
  };
  process.on("SIGINT", () => apagar("SIGINT"));
  process.on("SIGTERM", () => apagar("SIGTERM"));
}

main();
