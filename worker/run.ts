/**
 * Ejecucion puntual de una tarea del worker, para depurar (docs/05).
 *
 *   pnpm worker:barrido      un barrido ahora
 *   pnpm worker:refrescar    pide de nuevo todas las fichas guardadas
 *   pnpm worker:avisos       encola y envia los avisos de las 08:00 ahora
 *
 * Termina con codigo distinto de cero si la tarea falla, para que el journal y
 * cualquier envoltorio lo noten.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { MpClient } from "@/lib/mp/client";
import { env } from "@/lib/env";
import { alerts } from "./jobs/alerts";
import { refreshAll } from "./jobs/refresh";
import { sweep } from "./jobs/sweep";

type Task = "sweep" | "refresh" | "alerts" | "history" | "awards";

const IMPLEMENTED: Task[] = ["sweep", "refresh", "alerts"];
const PLANNED: Task[] = ["history", "awards"];

function usage(): never {
  console.error(
    [
      "Uso: tsx worker/run.ts <tarea>",
      "",
      `  disponibles: ${IMPLEMENTED.join(", ")}`,
      `  planificadas: ${PLANNED.join(", ")} (docs/05)`,
    ].join("\n"),
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const task = process.argv[2] as Task | undefined;
  if (!task) usage();

  if (PLANNED.includes(task)) {
    console.error(`La tarea "${task}" todavia no esta implementada (docs/05).`);
    process.exit(2);
  }

  if (!IMPLEMENTED.includes(task)) usage();

  const client = new MpClient({
    ticket: env.MP_API_TICKET,
    minIntervalMs: env.MP_MIN_INTERVAL_MS,
  });

  if (task === "refresh") {
    logger.info(await refreshAll({ client }), "refresco puntual terminado");
    return;
  }

  if (task === "alerts") {
    logger.info(await alerts(), "avisos puntuales terminados");
    return;
  }

  const counters = await sweep({ client });
  if (counters === null) {
    logger.warn("no se ejecuto: hay otro barrido en curso");
    return;
  }
  logger.info(counters, "barrido puntual terminado");
}

main()
  .catch((e) => {
    logger.error({ err: String(e) }, "la tarea fallo");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
