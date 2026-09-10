/**
 * Barrido periodico (docs/05; RF-01, RF-02, RF-03).
 *
 * Cada dos horas: pide la lista de activas, decide cuales entran al tablero y
 * refresca las que el equipo tiene abiertas.
 *
 * Dos ideas gobiernan el diseno:
 *
 * 1. **La cuota es finita.** El listado de activas cuesta una llamada y trae ~4.600
 *    registros con solo el nombre. La ficha cuesta una llamada por licitacion, asi
 *    que solo se pide cuando el nombre deja el puntaje a un punto del umbral (docs/04).
 *
 * 2. **Un error no bota el barrido.** Si una ficha falla, se anota en `counters.failed`
 *    y el ciclo sigue; el proximo barrido la reintenta. Perder una ficha es barato,
 *    perder el barrido entero no.
 */
import type { Prisma } from "@/generated/prisma/client";
import {
  classifyBuyer,
  classifyVertical,
  detectIncumbentSignals,
  detectOpportunitySignals,
} from "@/lib/affinity/classify";
import { evaluate, scoreText, worthFetchingDetail } from "@/lib/affinity/rules";
import { prisma } from "@/lib/db";
import { jobLogger } from "@/lib/logger";
import { MpClient, type ActiveListing } from "@/lib/mp/client";
import { parseChileDate, parseTenderDetail, type TenderDetail } from "@/lib/mp/parsers";
import { dispatchPending } from "@/lib/notifications/dispatch";
import { loadRules, loadSettings } from "@/lib/settings";

const log = jobLogger("sweep");

/** Estados en los que el equipo todavia sigue la licitacion (docs/07). */
const OPEN_STATES = ["NEW", "IN_REVIEW", "VIABLE", "SUBMITTED"] as const;

/**
 * Tope de fichas a refrescar por barrido.
 *
 * Protege la cuota diaria cuando muchas licitaciones abiertas salen de la lista de
 * activas a la vez. Lo que no alcanza queda para el ciclo siguiente y se registra
 * en `counters.deferred`, para que el recorte nunca sea silencioso.
 */
export const MAX_REFRESH_PER_RUN = 40;

/** Si un `JobRun` lleva mas de esto abierto, se considera colgado (docs/05). */
export const STALE_RUN_MS = 2 * 60 * 60 * 1000;

export interface SweepCounters {
  fetched: number;
  selected: number;
  created: number;
  updated: number;
  refreshed: number;
  notified: number;
  deferred: number;
  sent: number;
  sendFailed: number;
  apiCalls: number;
  retries: number;
  failed: string[];
}

export interface SweepDeps {
  client: MpClient;
  now?: () => Date;
}

/**
 * Un solo barrido a la vez.
 *
 * Si hay un `JobRun` de este tipo abierto y con menos de dos horas, se asume que
 * otro proceso sigue trabajando y este se salta. Pasadas las dos horas se considera
 * colgado y se deja pasar, para que una caida no bloquee el radar para siempre.
 */
async function isAlreadyRunning(now: Date): Promise<boolean> {
  const open = await prisma.jobRun.findFirst({
    where: { type: "SWEEP", finishedAt: null, startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) } },
    orderBy: { startedAt: "desc" },
  });
  return open !== null;
}

export async function sweep(deps: SweepDeps): Promise<SweepCounters | null> {
  const now = deps.now ?? (() => new Date());

  if (await isAlreadyRunning(now())) {
    log.warn("hay un barrido en curso; este ciclo se omite");
    return null;
  }

  const run = await prisma.jobRun.create({ data: { type: "SWEEP" } });
  const counters: SweepCounters = {
    fetched: 0, selected: 0, created: 0, updated: 0, refreshed: 0,
    notified: 0, deferred: 0, sent: 0, sendFailed: 0, apiCalls: 0, retries: 0, failed: [],
  };

  try {
    const [settings, rules] = await Promise.all([loadSettings(), loadRules()]);
    const active = await deps.client.getActive();
    counters.fetched = active.length;
    log.info({ activas: active.length }, "listado de activas recibido");

    // Se trae la fecha de cierre guardada para detectar prorrogas sin pedir la ficha.
    const known = new Map(
      (await prisma.tender.findMany({ select: { code: true, closesAt: true } })).map((t) => [
        t.code,
        { closesAt: t.closesAt },
      ]),
    );

    for (const item of active) {
      try {
        const outcome = await processListing(item, { known, settings, rules, client: deps.client });
        if (outcome.selected) counters.selected++;
        if (outcome.created) counters.created++;
        if (outcome.updated) counters.updated++;
        if (outcome.notified) counters.notified++;
      } catch (e) {
        counters.failed.push(item.CodigoExterno);
        log.error({ codigo: item.CodigoExterno, err: String(e) }, "fallo al procesar una activa");
      }
    }

    const refresh = await refreshDisappeared(active, deps.client, counters);
    counters.refreshed = refresh.refreshed;
    counters.deferred = refresh.deferred;

    // Los avisos se envian al cerrar el ciclo, no al encolarlos: si el barrido
    // falla a mitad, no queda un correo anunciando algo que no se guardo.
    const dispatched = await dispatchPending();
    counters.sent = dispatched.sent;
    counters.sendFailed = dispatched.failed + dispatched.givenUp;

    counters.apiCalls = deps.client.counters.apiCalls;
    counters.retries = deps.client.counters.retries;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: true, counters: counters as unknown as Prisma.InputJsonValue },
    });
    log.info(counters, "barrido terminado");
    return counters;
  } catch (e) {
    counters.apiCalls = deps.client.counters.apiCalls;
    counters.retries = deps.client.counters.retries;
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: false,
        error: String(e),
        counters: counters as unknown as Prisma.InputJsonValue,
      },
    });
    log.error({ err: String(e) }, "el barrido fallo");
    throw e;
  }
}

interface ProcessContext {
  known: Map<string, { closesAt: Date | null }>;
  settings: Awaited<ReturnType<typeof loadSettings>>;
  rules: Awaited<ReturnType<typeof loadRules>>;
  client: MpClient;
}

/**
 * Una licitacion del listado: puntuar, decidir si merece la ficha, y guardar.
 *
 * Toda activa queda en `SeenTender`, entre o no. Es lo que permite la vista previa
 * de reglas y detectar mas tarde que algo relevante no fue seleccionado (docs/02).
 *
 * La ficha **solo** se pide para codigos que no estan en `Tender`, o para los que
 * estan y cuya fecha de cierre cambio (docs/05, pasos 2 y 3). Pedirla en cada ciclo
 * para todo lo que ronda el umbral costaba 198 llamadas y 12 minutos por barrido,
 * contra las 5 a 40 que `docs/03` da por normales.
 */
async function processListing(
  item: ActiveListing,
  ctx: ProcessContext,
): Promise<{ selected: boolean; created: boolean; updated: boolean; notified: boolean }> {
  const code = item.CodigoExterno;
  const name = item.Nombre ?? "";
  const listedClosesAt = parseChileDate(item.FechaCierre);

  // Etapa 1: solo el nombre, que es lo unico que trae el listado.
  const byName = scoreText(name, ctx.rules);
  const byNameVerdict = evaluate({ text: name }, ctx.rules, ctx.settings);

  await prisma.seenTender.upsert({
    where: { code },
    update: {
      name,
      closesAt: listedClosesAt,
      portalStatus: item.CodigoEstado ?? null,
      lastScore: byNameVerdict.score,
      selected: byNameVerdict.selected,
    },
    create: {
      code,
      name,
      closesAt: listedClosesAt,
      portalStatus: item.CodigoEstado ?? null,
      lastScore: byNameVerdict.score,
      selected: byNameVerdict.selected,
    },
  });

  const existing = ctx.known.get(code);
  const nothing = { selected: byNameVerdict.selected, created: false, updated: false, notified: false };

  if (existing) {
    // Ya esta en el tablero: solo se vuelve a pedir la ficha si el cierre cambio,
    // que es lo que indica una prorroga y le importa a quien la esta revisando.
    const moved =
      listedClosesAt !== null &&
      (existing.closesAt === null || existing.closesAt.getTime() !== listedClosesAt.getTime());
    if (!moved) return nothing;
  } else if (!worthFetchingDetail(byName.score, ctx.settings)) {
    // Etapa 2 solo si el nombre dejo el puntaje cerca del umbral (docs/04).
    return nothing;
  }

  const detail = await ctx.client.getTender<TenderDetail>(code);
  const fields = parseTenderDetail(detail);
  const text = `${fields.name} ${fields.description}`;
  const verdict = evaluate(
    { text, amount: fields.estimatedAmount, processType: fields.processType },
    ctx.rules,
    ctx.settings,
  );

  await prisma.seenTender.update({
    where: { code },
    data: { lastScore: verdict.score, selected: verdict.selected },
  });

  if (!verdict.selected) {
    return { selected: false, created: false, updated: false, notified: false };
  }

  const data = {
    ...fields,
    vertical: classifyVertical(text, ctx.rules),
    buyerType: classifyBuyer(fields.buyerOrganism, fields.buyerUnit, ctx.rules),
    incumbentSignals: detectIncumbentSignals(text, ctx.rules),
    opportunitySignals: detectOpportunitySignals(text, ctx.rules),
    affinityScore: verdict.score,
    matchedTerms: verdict.matchedTerms,
    outOfScale: verdict.outOfScale,
    raw: detail as unknown as Prisma.InputJsonValue,
  };

  await prisma.tender.upsert({
    where: { code },
    update: { ...data, lastSyncedAt: new Date() },
    create: data,
  });

  const isNew = !existing;
  ctx.known.set(code, { closesAt: fields.closesAt });

  let notified = false;
  if (isNew && verdict.score >= ctx.settings.highAffinityThreshold) {
    notified = await queueHighAffinityNotice(code, {
      code,
      name: fields.name,
      // La descripcion se recorta al armar el correo, no aqui: guardarla entera
      // deja el aviso reconstruible si manana cambia la plantilla.
      description: fields.description,
      organism: fields.buyerOrganism,
      unit: fields.buyerUnit,
      region: fields.region,
      processType: fields.processType,
      closesAt: fields.closesAt?.toISOString() ?? null,
      questionsUntil: fields.questionsUntil?.toISOString() ?? null,
      amount: fields.estimatedAmount,
      currency: fields.currency,
      score: verdict.score,
      threshold: ctx.settings.highAffinityThreshold,
      matchedTerms: verdict.matchedTerms,
      incumbentSignals: data.incumbentSignals,
      opportunitySignals: data.opportunitySignals,
      outOfScale: verdict.outOfScale,
    });
  }

  return { selected: true, created: isNew, updated: !isNew, notified };
}

/**
 * Deja el aviso en cola como PENDING (D-16). No lo envia: de eso se encarga
 * el envio de correo, que lo pasa a SENT con el id de Resend o a FAILED (docs/08).
 *
 * `dedupeKey` garantiza un aviso por tipo y licitacion aunque el barrido se repita.
 */
async function queueHighAffinityNotice(
  code: string,
  payload: Prisma.InputJsonValue,
): Promise<boolean> {
  const created = await prisma.notification.createMany({
    data: [
      {
        dedupeKey: `NEW_HIGH_AFFINITY:${code}`,
        type: "NEW_HIGH_AFFINITY",
        tenderId: null,
        payload,
      },
    ],
    skipDuplicates: true,
  });
  return created.count > 0;
}

/**
 * Licitaciones abiertas que ya no aparecen entre las activas.
 *
 * Salieron de la lista porque cerraron, se adjudicaron o se desertaron, y eso es
 * justo lo que el equipo necesita saber. Se refrescan con tope, para no vaciar la
 * cuota si un dia salen muchas juntas.
 */
async function refreshDisappeared(
  active: ActiveListing[],
  client: MpClient,
  counters: SweepCounters,
): Promise<{ refreshed: number; deferred: number }> {
  const activeCodes = new Set(active.map((a) => a.CodigoExterno));

  const open = await prisma.tender.findMany({
    where: { reviewStatus: { in: [...OPEN_STATES] } },
    select: { code: true },
    orderBy: { lastSyncedAt: "asc" },
  });

  const gone = open.filter((t) => !activeCodes.has(t.code));
  const batch = gone.slice(0, MAX_REFRESH_PER_RUN);
  const deferred = gone.length - batch.length;

  if (deferred > 0) {
    log.warn({ pendientes: deferred }, "quedaron fichas sin refrescar por el tope del ciclo");
  }

  let refreshed = 0;
  for (const { code } of batch) {
    try {
      const detail = await client.getTender<TenderDetail>(code);
      const fields = parseTenderDetail(detail);
      await prisma.tender.update({
        where: { code },
        data: {
          portalStatus: fields.portalStatus,
          closesAt: fields.closesAt,
          awardEstimatedAt: fields.awardEstimatedAt,
          lastSyncedAt: new Date(),
          raw: detail as unknown as Prisma.InputJsonValue,
        },
      });
      refreshed++;
    } catch (e) {
      counters.failed.push(code);
      log.error({ codigo: code, err: String(e) }, "fallo al refrescar una ficha");
    }
  }

  return { refreshed, deferred };
}
