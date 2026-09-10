/**
 * Refresco de las fichas guardadas (docs/05).
 *
 * El barrido no vuelve a mirar una licitacion que ya existe en `Tender`: solo
 * la pide de nuevo si cambio su fecha de cierre, que es lo que indica una
 * prorroga (docs/05, paso 3). Es la decision correcta para la cuota diaria
 * —pedir 4.700 fichas por ciclo no cabe— pero deja el resto de los campos con
 * el valor que tenian el dia que entro: monto, estado del portal, fin de
 * preguntas, adjudicacion estimada.
 *
 * Esta tarea pide **todas** las fichas guardadas y las deja al dia. Es manual y
 * puntual, no va en el cron: son tantas llamadas como licitaciones en el
 * tablero, y solo hace falta cuando algo quedo viejo.
 *
 * No borra ni descarta. Vuelve a puntuar y clasificar con las reglas de ahora,
 * pero **no toca `reviewStatus`**: lo que el equipo decidio sobre una licitacion
 * no lo cambia una llamada a la API.
 */
import type { Prisma } from "@/generated/prisma/client";
import {
  classifyBuyer,
  classifyVertical,
  detectIncumbentSignals,
  detectOpportunitySignals,
} from "@/lib/affinity/classify";
import { evaluate, withStructural } from "@/lib/affinity/rules";
import { computeStructural } from "@/lib/affinity/structural";
import { prisma } from "@/lib/db";
import { jobLogger } from "@/lib/logger";
import type { MpClient } from "@/lib/mp/client";
import { parseTenderDetail, type TenderDetail } from "@/lib/mp/parsers";
import { loadRules, loadSettings } from "@/lib/settings";

const log = jobLogger("refresh");

export interface RefreshCounters {
  /** Fichas pedidas a la API. */
  pedidas: number;
  /** Las que cambiaron en algo. */
  actualizadas: number;
  /** Las que cambiaron de fecha de cierre: son prorrogas. */
  prorrogadas: number;
  /** Las que cambiaron de estado en el portal (cerrada, adjudicada, desierta). */
  cambiaronEstado: number;
  apiCalls: number;
  retries: number;
  /** Codigos que la API no devolvio. */
  fallidas: string[];
}

export interface RefreshDeps {
  client: MpClient;
  /** Solo estos codigos. Sin esto, todas las guardadas. */
  codes?: string[];
}

export async function refreshAll(deps: RefreshDeps): Promise<RefreshCounters> {
  const run = await prisma.jobRun.create({ data: { type: "REFRESH" } });
  const counters: RefreshCounters = {
    pedidas: 0,
    actualizadas: 0,
    prorrogadas: 0,
    cambiaronEstado: 0,
    apiCalls: 0,
    retries: 0,
    fallidas: [],
  };

  try {
    const [settings, rules] = await Promise.all([loadSettings(), loadRules()]);

    // De la mas vieja a la mas nueva: si el proceso se corta a la mitad, lo que
    // alcanzo a refrescarse es justo lo que estaba mas desactualizado.
    const guardadas = await prisma.tender.findMany({
      where: deps.codes ? { code: { in: deps.codes } } : {},
      select: { id: true, code: true, closesAt: true, portalStatus: true },
      orderBy: { lastSyncedAt: "asc" },
    });

    log.info({ total: guardadas.length }, "refrescando las fichas guardadas");

    for (const previa of guardadas) {
      try {
        const detail = await deps.client.getTender<TenderDetail>(previa.code);
        counters.pedidas++;

        const fields = parseTenderDetail(detail);
        const texto = `${fields.name} ${fields.description}`;
        const porTexto = evaluate(
          {
            text: texto,
            amount: fields.estimatedAmount,
            processType: fields.processType,
          },
          rules,
          settings,
        );
        const opportunitySignals = detectOpportunitySignals(texto, rules);
        const estructural = computeStructural({ ...fields, items: fields.items ?? null, opportunitySignals }, settings);
        const veredicto = withStructural(porTexto, estructural, settings);

        const prorrogada =
          fields.closesAt !== null &&
          (previa.closesAt === null || previa.closesAt.getTime() !== fields.closesAt.getTime());
        const cambioEstado = fields.portalStatus !== previa.portalStatus;

        await prisma.tender.update({
          where: { id: previa.id },
          data: {
            ...fields,
            vertical: classifyVertical(texto, rules),
            buyerType: classifyBuyer(fields.buyerOrganism, fields.buyerUnit, rules),
            incumbentSignals: detectIncumbentSignals(texto, rules),
            opportunitySignals,
            affinityScore: veredicto.score,
            textScore: porTexto.score,
            structuralScore: estructural.score,
            structuralTags: estructural.tags,
            matchedTerms: veredicto.matchedTerms,
            outOfScale: veredicto.outOfScale,
            raw: detail as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
            // reviewStatus queda como esta: es del equipo, no de la API.
          },
        });

        counters.actualizadas++;
        if (prorrogada) counters.prorrogadas++;
        if (cambioEstado) counters.cambiaronEstado++;
      } catch (e) {
        // Una ficha que falla no bota el refresco entero: queda anotada y el
        // resto sigue, igual que en el barrido.
        counters.fallidas.push(previa.code);
        log.error({ codigo: previa.code, err: String(e) }, "no se pudo refrescar una ficha");
      }
    }

    counters.apiCalls = deps.client.counters.apiCalls;
    counters.retries = deps.client.counters.retries;

    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        ok: true,
        counters: counters as unknown as Prisma.InputJsonValue,
      },
    });
    log.info(counters, "refresco terminado");
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
    log.error({ err: String(e) }, "el refresco fallo");
    throw e;
  }
}
