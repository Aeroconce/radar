/**
 * Traer al tablero una activa que las reglas no seleccionaron (D-32).
 *
 * Es la red de seguridad contra el proximo falso negativo: el radar ve ~4.700
 * activas por barrido y selecciona ~30. Si alguien encuentra entre las vistas
 * una que las reglas dejaron pasar, la trae con un clic en vez de esperar a que
 * se ajuste una regla.
 *
 * La accion pide la ficha a la API en el momento —una llamada, con el mismo
 * cliente y ritmo del worker— y crea la licitacion como cualquier otra, con su
 * puntaje real aunque este bajo el umbral. El puntaje bajo no es un error: es
 * el registro de que esta la trajo una persona, no una regla.
 */
"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import {
  classifyBuyer,
  classifyVertical,
  detectIncumbentSignals,
  detectOpportunitySignals,
} from "@/lib/affinity/classify";
import { evaluate } from "@/lib/affinity/rules";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MpClient, NotFound } from "@/lib/mp/client";
import { parseTenderDetail, type TenderDetail } from "@/lib/mp/parsers";
import { perfilParaEscribir } from "@/lib/perfil";
import { getSession } from "@/lib/session";
import { loadRules, loadSettings } from "@/lib/settings";

export interface ResultadoTraer {
  ok: boolean;
  mensaje?: string;
  error?: string;
}

export async function traerAlTablero(code: string): Promise<ResultadoTraer> {
  const session = await getSession();
  if (!session) return { ok: false, error: "La sesión expiró. Vuelve a entrar." };

  const perfil = await perfilParaEscribir();
  if (!perfil) return { ok: false, error: "Elige un perfil primero." };

  const vista = await prisma.seenTender.findUnique({ where: { code } });
  if (!vista) return { ok: false, error: "Ese código no está entre las vistas." };

  const existente = await prisma.tender.findUnique({ where: { code }, select: { id: true } });
  if (existente) return { ok: true, mensaje: "Ya está en el tablero." };

  const client = new MpClient({
    ticket: env.MP_API_TICKET,
    minIntervalMs: env.MP_MIN_INTERVAL_MS,
  });

  let detail: TenderDetail;
  try {
    detail = await client.getTender<TenderDetail>(code);
  } catch (e) {
    if (e instanceof NotFound) {
      return { ok: false, error: "La API ya no devuelve esa licitación. Puede haber cerrado." };
    }
    return { ok: false, error: "La API de Mercado Público no respondió. Intenta de nuevo." };
  }

  const [rules, settings] = await Promise.all([loadRules(), loadSettings()]);
  const fields = parseTenderDetail(detail);
  const texto = `${fields.name} ${fields.description}`;
  const veredicto = evaluate(
    { text: texto, amount: fields.estimatedAmount, processType: fields.processType },
    rules,
    settings,
  );

  await prisma.$transaction([
    prisma.tender.create({
      data: {
        ...fields,
        vertical: classifyVertical(texto, rules),
        buyerType: classifyBuyer(fields.buyerOrganism, fields.buyerUnit, rules),
        incumbentSignals: detectIncumbentSignals(texto, rules),
        opportunitySignals: detectOpportunitySignals(texto, rules),
        affinityScore: veredicto.score,
        matchedTerms: veredicto.matchedTerms,
        outOfScale: veredicto.outOfScale,
        raw: detail as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.seenTender.update({
      where: { code },
      data: { selected: true, lastScore: veredicto.score },
    }),
    // Quien la trajo queda en la bitacora: si las reglas la habian dejado
    // fuera, ese dato es un falso negativo documentado, util para ajustarlas.
    prisma.auditLog.create({
      data: {
        userName: perfil,
        action: "tender.pull",
        entity: "Tender",
        entityId: code,
        detail: `traída a mano desde las vistas · puntaje ${veredicto.score}`,
      },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/vistas");

  return {
    ok: true,
    mensaje:
      veredicto.score < settings.affinityThreshold
        ? `En el tablero. Su puntaje (${veredicto.score}) quedó bajo el umbral: las reglas no la habrían traído.`
        : "En el tablero.",
  };
}
