/**
 * Entrega de los avisos encolados (docs/08).
 *
 * La fila de `Notification` nace `PENDING` cuando el barrido decide avisar (D-16).
 * Aqui se envia y se registra el resultado: `SENT` con el id de Resend, o `FAILED`
 * con el error para que el ciclo siguiente lo reintente.
 *
 * Separado de `email.ts` a proposito: ese modulo solo arma y entrega un correo,
 * este decide que se envia y lleva la cuenta de los intentos.
 */
import type { NoticePayload } from "./email";
import { renderNotice, sendEmail } from "./email";
import { prisma } from "@/lib/db";
import { jobLogger } from "@/lib/logger";

const log = jobLogger("notificaciones");

/**
 * Tras cuatro intentos se deja de insistir.
 *
 * Un aviso que fallo cuatro veces no va a salir por reintentar una quinta: o el
 * destinatario esta mal o Resend rechaza el contenido. Queda `FAILED` con su error,
 * visible en Configuracion, en vez de repetirse cada dos horas para siempre.
 */
export const MAX_ATTEMPTS = 4;

/** Resend limita las peticiones por segundo; una pausa corta basta (docs/08). */
const GAP_MS = 600;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface DispatchResult {
  sent: number;
  failed: number;
  givenUp: number;
}

export interface DispatchOptions {
  /** Tope por ciclo, para no vaciar el limite del plan de una vez. */
  limit?: number;
  sleep?: (ms: number) => Promise<void>;
}

export async function dispatchPending(options: DispatchOptions = {}): Promise<DispatchResult> {
  const sleep = options.sleep ?? wait;
  const result: DispatchResult = { sent: 0, failed: 0, givenUp: 0 };

  const queued = await prisma.notification.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 50,
  });

  if (queued.length === 0) return result;
  log.info({ pendientes: queued.length }, "avisos por enviar");

  for (const [index, notice] of queued.entries()) {
    if (index > 0) await sleep(GAP_MS);

    const content = renderNotice(notice.type, (notice.payload ?? {}) as NoticePayload);

    if (!content) {
      // Tipo sin plantilla: se marca fallido en vez de enviar algo a medias.
      await prisma.notification.update({
        where: { id: notice.id },
        data: {
          status: "FAILED",
          attempts: MAX_ATTEMPTS,
          error: `sin plantilla para el tipo ${notice.type}`,
        },
      });
      result.givenUp++;
      log.error({ tipo: notice.type, dedupeKey: notice.dedupeKey }, "aviso sin plantilla");
      continue;
    }

    const outcome = await sendEmail(content);
    const attempts = notice.attempts + 1;

    if (outcome.ok) {
      await prisma.notification.update({
        where: { id: notice.id },
        data: { status: "SENT", providerId: outcome.providerId, sentAt: new Date(), attempts, error: null },
      });
      result.sent++;
      log.info({ dedupeKey: notice.dedupeKey, providerId: outcome.providerId }, "aviso enviado");
      continue;
    }

    await prisma.notification.update({
      where: { id: notice.id },
      data: { status: "FAILED", attempts, error: outcome.error ?? "error desconocido" },
    });

    if (attempts >= MAX_ATTEMPTS) {
      result.givenUp++;
      log.error({ dedupeKey: notice.dedupeKey, error: outcome.error }, "aviso descartado tras agotar los intentos");
    } else {
      result.failed++;
      log.warn({ dedupeKey: notice.dedupeKey, error: outcome.error, attempts }, "aviso fallido; se reintenta");
    }
  }

  return result;
}
