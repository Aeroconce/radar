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
 * Todos miran **lo mismo que muestra el tablero** (D-52): sobre el umbral
 * vigente y vivas en el portal, el filtro de `whereVisibles`. Antes contaban
 * sobre toda la tabla: el correo decia "14 nuevas" donde la pantalla mostraba 2
 * y anunciaba el cierre de licitaciones que una exclusion ya habia sacado.
 *
 * La tarea solo **encola** (`PENDING`) y despacha al final, como el barrido: si
 * algo falla a mitad, no queda un correo anunciando lo que no se guardo (D-16).
 */
import type { Prisma } from "@/generated/prisma/client";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { classifyVertical } from "@/lib/affinity/classify";
import { prisma } from "@/lib/db";
import { jobLogger } from "@/lib/logger";
import { casiEntran, entraronPorPoco, esLunes, type LineaDigest } from "@/lib/notifications/digest";
import { dispatchPending } from "@/lib/notifications/dispatch";
import { ESTADOS } from "@/lib/reviews";
import { loadRules, loadSettings } from "@/lib/settings";
import { whereVisibles, whereVivas } from "@/lib/tablero-filtros";

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

/** Con decision humana de por medio: las que reciben recordatorios de plazo. */
const EN_CARPETA: ReviewStatus[] = ["VIABLE", "IN_REVIEW"];

/** Lo que aun se puede trabajar: entra en los cierres de la semana. */
const POR_TRABAJAR: ReviewStatus[] = ["NEW", "IN_REVIEW", "VIABLE", "SUBMITTED"];

export interface FiltrosDeLaManana {
  /** Viables o en revision que cierran en 5 dias o menos. */
  porCerrar: Prisma.TenderWhereInput;
  /** Viables o en revision cuyo foro de preguntas cierra dentro de 24 horas. */
  foroPorCerrar: Prisma.TenderWhereInput;
  /** Los conteos del resumen: los mismos chips de estado del tablero. */
  conteo: (estado: ReviewStatus) => Prisma.TenderWhereInput;
  /** Cierres de la semana: lo del tablero que aun se trabaja y cierra en 7 dias. */
  semana: Prisma.TenderWhereInput;
  /** Lunes (D-51): nuevas justo sobre el umbral. */
  entraronPorPoco: Prisma.TenderWhereInput;
}

/**
 * Los filtros de la manana, todos a partir de lo visible en el tablero (D-52).
 *
 * Se arman aqui, puros, para poder probar que ninguno se olvide del umbral ni
 * de las cerradas: el dia que un aviso consulte `Tender` por su cuenta, el
 * correo y la pantalla vuelven a contar cosas distintas.
 */
export function filtrosDeLaManana(now: Date, umbral: number): FiltrosDeLaManana {
  const visibles = whereVisibles(umbral, now);
  return {
    porCerrar: { ...visibles, reviewStatus: { in: EN_CARPETA }, closesAt: { gte: now, lte: ventana(now, 5).hasta } },
    foroPorCerrar: { ...visibles, reviewStatus: { in: EN_CARPETA }, questionsUntil: { gte: now, lte: ventana(now, 1).hasta } },
    conteo: (estado) => ({ ...visibles, reviewStatus: estado }),
    semana: { ...visibles, reviewStatus: { in: POR_TRABAJAR }, closesAt: { gte: now, lte: ventana(now, 7).hasta } },
    // La banda reemplaza al umbral; las vivas se conservan.
    entraronPorPoco: { ...whereVivas(now), reviewStatus: "NEW", affinityScore: { gte: umbral, lte: umbral + 1 } },
  };
}

/** Lo que va en el cuerpo del `DAILY_DIGEST`. */
export interface ResumenDelDia {
  counts: { nuevas: number; enRevision: number; viables: number };
  closingThisWeek: Array<{ code: string; name: string; closesAt: string | null }>;
  sweep?: { finishedAt: string | null; ok: boolean | null };
  casiEntran?: LineaDigest[];
  entraronPorPoco?: LineaDigest[];
}

/**
 * Arma el resumen del dia. Solo lee: no encola ni envia, asi que sirve para
 * ver desde la consola lo que diria el correo de manana sin mandarlo.
 */
export async function resumenDelDia(now: Date, umbral: number): Promise<ResumenDelDia> {
  const filtros = filtrosDeLaManana(now, umbral);
  const [nuevas, enRevision, viables, semana, ultimoBarrido] = await Promise.all([
    prisma.tender.count({ where: filtros.conteo("NEW") }),
    prisma.tender.count({ where: filtros.conteo("IN_REVIEW") }),
    prisma.tender.count({ where: filtros.conteo("VIABLE") }),
    prisma.tender.findMany({
      where: filtros.semana,
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

  const resumen: ResumenDelDia = {
    counts: { nuevas, enRevision, viables },
    closingThisWeek: semana.map((t) => ({
      code: t.code,
      name: t.name,
      closesAt: t.closesAt?.toISOString() ?? null,
    })),
    ...(ultimoBarrido
      ? { sweep: { finishedAt: ultimoBarrido.finishedAt?.toISOString() ?? null, ok: ultimoBarrido.ok } }
      : {}),
  };
  if (!esLunes(now)) return resumen;

  // ------------------------------------------ lunes: a un paso del umbral (D-51)
  const [rules, ultimoOk] = await Promise.all([
    loadRules(),
    prisma.jobRun.findFirst({
      where: { type: "SWEEP", ok: true },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);
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
  const porPoco = await prisma.tender.findMany({
    where: filtros.entraronPorPoco,
    select: { code: true, name: true, affinityScore: true, vertical: true, structuralTags: true, reviewStatus: true },
    orderBy: { affinityScore: "desc" },
    take: 60,
  });
  return {
    ...resumen,
    // Las vistas no tienen ficha: la vertical se estima con el nombre y las reglas de hoy.
    casiEntran: casiEntran(vistas, umbral, (name) => classifyVertical(name, rules)),
    entraronPorPoco: entraronPorPoco(porPoco, umbral),
  };
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

/** Lo que la plantilla de un aviso por licitacion necesita. */
const SELECCION_AVISO = {
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
} satisfies Prisma.TenderSelect;

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
    // El umbral vigente decide que es "el tablero" (D-46, D-52).
    const { affinityThreshold: umbral } = await loadSettings();
    const filtros = filtrosDeLaManana(now, umbral);

    // ------------------------------------------------------------ CLOSING_SOON
    const porCerrar = await prisma.tender.findMany({ where: filtros.porCerrar, select: SELECCION_AVISO });

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
    const foroPorCerrar = await prisma.tender.findMany({ where: filtros.foroPorCerrar, select: SELECCION_AVISO });

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
    const resumen = await prisma.notification.createMany({
      data: [
        {
          dedupeKey: `DAILY_DIGEST:${fechaChile(now)}`,
          type: "DAILY_DIGEST",
          tenderId: null,
          // Las claves opcionales del lunes no encajan en InputJsonValue sin pasar por unknown.
          payload: (await resumenDelDia(now, umbral)) as unknown as Prisma.InputJsonValue,
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
