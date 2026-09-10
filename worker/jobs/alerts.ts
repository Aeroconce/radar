/**
 * Avisos de las 08:00 (RF-10, docs/08).
 *
 * Tres decisiones distintas del mismo horario:
 *
 * - `CLOSING_SOON`: una viable o en revision cierra en 5 dias o menos. Se avisa
 *   una sola vez por licitacion (`dedupeKey` por codigo): recordarla cada
 *   manana hasta el cierre convierte el aviso en ruido y el ruido en spam.
 * - `QUESTIONS_CLOSING`: el foro de preguntas cierra dentro de 24 horas.
 * - `DAILY_DIGEST`: el estado del tablero, uno por dia (`dedupeKey` por fecha
 *   de Chile). Incluye el estado del ultimo barrido (RN-07): es el unico lugar
 *   donde el equipo se entera de un fallo sin entrar al servidor. Los lunes
 *   trae ademas las que quedaron a un paso del umbral por los dos lados
 *   (docs/17, D-51): cada falso negativo o positivo real es una regla que falta.
 *
 * La tarea solo **encola** (`PENDING`) y despacha al final, como el barrido: si
 * algo falla a mitad, no queda un correo anunciando lo que no se guardo (D-16).
 */
import type { Prisma } from "@/generated/prisma/client";
import { classifyVertical } from "@/lib/affinity/classify";
import { prisma } from "@/lib/db";
import { jobLogger } from "@/lib/logger";
import { casiEntran, entraronPorPoco, esLunes, type LineaDigest } from "@/lib/notifications/digest";
import { dispatchPending } from "@/lib/notifications/dispatch";
import { ESTADOS } from "@/lib/reviews";
import { loadRules, loadSettings } from "@/lib/settings";

const log = jobLogger("alerts");

const DIA_MS = 24 * 60 * 60 * 1000;

/** Cierra dentro de N dias, contando desde ahora. */
export function ventana(now: Date, dias: number): { desde: Date; hasta: Date } {
  return { desde: now, hasta: new Date(now.getTime() + dias * DIA_MS) };
}

/**
 * La fecha de Chile, no la del servidor.
 *
 * El servidor esta en UTC: a las 08:00 de Chile son las 11 o las 12 UTC del
 * mismo dia, asi que la diferencia rara vez muerde. Se calcula igual con la
 * zona explicita, porque un resumen fechado manana confunde y ademas rompe la
 * idempotencia del `dedupeKey`.
 */
export function fechaChile(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export interface AlertCounters {
  cierresEncolados: number;
  preguntasEncoladas: number;
  resumenEncolado: boolean;
  sent: number;
  sendFailed: number;
}

export interface AlertsDeps {
  now?: () => Date;
}

export async function alerts(deps: AlertsDeps = {}): Promise<AlertCounters> {
  const now = (deps.now ?? (() => new Date()))();
  const run = await prisma.jobRun.create({ data: { type: "ALERTS" } });
  const counters: AlertCounters = {
    cierresEncolados: 0,
    preguntasEncoladas: 0,
    resumenEncolado: false,
    sent: 0,
    sendFailed: 0,
  };

  try {
    // ------------------------------------------------------------ CLOSING_SOON
    const cierre = ventana(now, 5);
    const porCerrar = await prisma.tender.findMany({
      where: {
        reviewStatus: { in: ["VIABLE", "IN_REVIEW"] },
        closesAt: { gte: cierre.desde, lte: cierre.hasta },
      },
      select: {
        id: true,
        code: true,
        name: true,
        buyerOrganism: true,
        buyerUnit: true,
        region: true,
        processType: true,
        closesAt: true,
        questionsUntil: true,
        estimatedAmount: true,
        currency: true,
        reviewStatus: true,
      },
    });

    for (const t of porCerrar) {
      const creada = await prisma.notification.createMany({
        data: [
          {
            dedupeKey: `CLOSING_SOON:${t.code}`,
            type: "CLOSING_SOON",
            tenderId: t.id,
            payload: payloadDe(t),
          },
        ],
        skipDuplicates: true,
      });
      counters.cierresEncolados += creada.count;
    }

    // -------------------------------------------------------- QUESTIONS_CLOSING
    const preguntas = ventana(now, 1);
    const foroPorCerrar = await prisma.tender.findMany({
      where: {
        reviewStatus: { in: ["VIABLE", "IN_REVIEW"] },
        questionsUntil: { gte: preguntas.desde, lte: preguntas.hasta },
      },
      select: {
        id: true,
        code: true,
        name: true,
        buyerOrganism: true,
        buyerUnit: true,
        region: true,
        processType: true,
        closesAt: true,
        questionsUntil: true,
        estimatedAmount: true,
        currency: true,
        reviewStatus: true,
      },
    });

    for (const t of foroPorCerrar) {
      const creada = await prisma.notification.createMany({
        data: [
          {
            dedupeKey: `QUESTIONS_CLOSING:${t.code}`,
            type: "QUESTIONS_CLOSING",
            tenderId: t.id,
            payload: payloadDe(t),
          },
        ],
        skipDuplicates: true,
      });
      counters.preguntasEncoladas += creada.count;
    }

    // -------------------------------------------------------------- DAILY_DIGEST
    const [nuevas, enRevision, viables, semana, ultimoBarrido] = await Promise.all([
      prisma.tender.count({ where: { reviewStatus: "NEW" } }),
      prisma.tender.count({ where: { reviewStatus: "IN_REVIEW" } }),
      prisma.tender.count({ where: { reviewStatus: "VIABLE" } }),
      prisma.tender.findMany({
        where: {
          reviewStatus: { in: ["NEW", "IN_REVIEW", "VIABLE", "SUBMITTED"] },
          closesAt: { gte: now, lte: ventana(now, 7).hasta },
        },
        orderBy: { closesAt: "asc" },
        take: 12,
        select: { code: true, name: true, closesAt: true },
      }),
      prisma.jobRun.findFirst({
        where: { type: "SWEEP", finishedAt: { not: null } },
        orderBy: { startedAt: "desc" },
        select: { finishedAt: true, ok: true },
      }),
    ]);

    // ------------------------------------------ lunes: a un paso del umbral (D-51)
    let lunes: { casiEntran: LineaDigest[]; entraronPorPoco: LineaDigest[] } | null = null;
    if (esLunes(now)) {
      const [settings, rules, ultimoOk] = await Promise.all([
        loadSettings(),
        loadRules(),
        prisma.jobRun.findFirst({
          where: { type: "SWEEP", ok: true },
          orderBy: { startedAt: "desc" },
          select: { startedAt: true },
        }),
      ]);
      const umbral = settings.affinityThreshold;
      // Solo las vistas en el ultimo barrido: lo de hace semanas ya cerro.
      const vistas = await prisma.seenTender.findMany({
        where: {
          selected: false,
          lastScore: { gte: umbral - 2, lte: umbral - 1 },
          ...(ultimoOk ? { lastSeenAt: { gte: ultimoOk.startedAt } } : {}),
        },
        select: { code: true, name: true, lastScore: true, selected: true },
        orderBy: { lastScore: "desc" },
        take: 60,
      });
      const nuevas = await prisma.tender.findMany({
        where: { reviewStatus: "NEW", affinityScore: { gte: umbral, lte: umbral + 1 } },
        select: { code: true, name: true, affinityScore: true, vertical: true, structuralTags: true, reviewStatus: true },
        orderBy: { affinityScore: "desc" },
        take: 60,
      });
      lunes = {
        // Las vistas no tienen ficha: la vertical se estima con el nombre y las reglas de hoy.
        casiEntran: casiEntran(vistas, umbral, (name) => classifyVertical(name, rules)),
        entraronPorPoco: entraronPorPoco(nuevas, umbral),
      };
    }

    const resumen = await prisma.notification.createMany({
      data: [
        {
          dedupeKey: `DAILY_DIGEST:${fechaChile(now)}`,
          type: "DAILY_DIGEST",
          tenderId: null,
          payload: {
            counts: { nuevas, enRevision, viables },
            closingThisWeek: semana.map((t) => ({
              code: t.code,
              name: t.name,
              closesAt: t.closesAt?.toISOString() ?? null,
            })),
            sweep: ultimoBarrido
              ? { finishedAt: ultimoBarrido.finishedAt?.toISOString() ?? null, ok: ultimoBarrido.ok }
              : undefined,
            ...(lunes ?? {}),
            // Las claves opcionales del lunes no encajan en InputJsonValue sin pasar por unknown.
          } as unknown as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    });
    counters.resumenEncolado = resumen.count > 0;

    // Despachar al cerrar, no al encolar (D-16).
    const enviados = await dispatchPending();
    counters.sent = enviados.sent;
    counters.sendFailed = enviados.failed + enviados.givenUp;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: true, counters: counters as unknown as Prisma.InputJsonValue },
    });
    log.info(counters, "avisos de la manana listos");
    return counters;
  } catch (e) {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: false,
        error: String(e),
        counters: counters as unknown as Prisma.InputJsonValue,
      },
    });
    log.error({ err: String(e) }, "los avisos de la manana fallaron");
    throw e;
  }
}

/** Lo que la plantilla necesita, con el estado ya en palabras. */
function payloadDe(t: {
  code: string;
  name: string;
  buyerOrganism: string;
  buyerUnit: string;
  region: string;
  processType: string;
  closesAt: Date | null;
  questionsUntil: Date | null;
  estimatedAmount: Prisma.Decimal | null;
  currency: string;
  reviewStatus: keyof typeof ESTADOS;
}): Prisma.InputJsonValue {
  return {
    code: t.code,
    name: t.name,
    organism: t.buyerOrganism,
    unit: t.buyerUnit,
    region: t.region,
    processType: t.processType,
    closesAt: t.closesAt?.toISOString() ?? null,
    questionsUntil: t.questionsUntil?.toISOString() ?? null,
    amount: t.estimatedAmount != null ? Number(t.estimatedAmount) : null,
    currency: t.currency,
    status: ESTADOS[t.reviewStatus].etiqueta,
  };
}
