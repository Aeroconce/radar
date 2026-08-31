/**
 * Semilla del Radar (docs/11). Carga los datos reales capturados con la API
 * la semana del 24 al 30 de agosto de 2026, mas las reglas iniciales de docs/04.
 *
 * Es idempotente: correrla dos veces no duplica nada.
 *
 * Lo que NO hace: clasificar vertical ni tipo de comprador. Eso es del motor de
 * afinidad (docs/04), que todavia no existe; las reglas quedan cargadas para el.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { classifyBuyer, classifyVertical, detectIncumbentSignals } from "@/lib/affinity/classify";
import { INITIAL_RULES, SEED_AUTHOR } from "@/lib/affinity/initial-rules";
import { evaluate, scoreText, worthFetchingDetail } from "@/lib/affinity/rules";
import { MpClient } from "@/lib/mp/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { parseTenderDetail, parseDurationLabel, parseAmount } from "@/lib/mp/parsers";
import type { TenderDetail } from "@/lib/mp/parsers";

const SEED_DIR = join(process.cwd(), "seed");
/**
 * Primer monto utilizable. No sirve `??` aqui: un 0 no es nullish, asi que
 * taparia el valor de respaldo cuando el acta no trae el monto parseado.
 */
const firstAmount = (...values: unknown[]): number | null => {
  for (const v of values) {
    const amount = parseAmount(v);
    if (amount !== null) return amount;
  }
  return null;
};

/** Los seeds salen de JSON.parse: son JSON valido por construccion. */
const asJson = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

const read = <T,>(file: string): T => JSON.parse(readFileSync(join(SEED_DIR, file), "utf-8")) as T;

// ---------------------------------------------------------------- datos

interface Candidate {
  score: number;
  codigo: string;
  nombre: string;
  cierre: string | null;
  hits: string[];
  tipo: string;
}
interface Award {
  codigo: string;
  nombre: string;
  org: string;
  region: string;
  estimado: number;
  oferentes: number;
  ganador: string;
  monto_adj: number;
  dur: string;
  fecha: string;
  acta: string;
}
interface Bid {
  rut: string;
  nombre: string;
  monto: number;
  estado: string;
}
interface Act {
  adjudicado: number;
  estimado_contrato: number;
  ofertas: Bid[];
}
interface Revision {
  codigo: string;
  estado: "NEW" | "IN_REVIEW" | "VIABLE" | "DISCARDED" | "SUBMITTED" | "AWARDED" | "LOST";
  motivos: string[];
  nota: string;
}

const details = read<Record<string, TenderDetail>>("licitaciones_detalle.json");
const candidates = read<Candidate[]>("candidatas_2026-08-27.json");
const awards = read<Award[]>("adjudicaciones_historicas.json");
const acts = read<Record<string, Act>>("actas_oferentes.json");
const revisiones = read<{ revisiones: Revision[] }>("revisiones.json").revisiones;

// ----------------------------------------------------- parametros iniciales

const SETTINGS: Array<[string, Prisma.InputJsonValue]> = [
  ["affinityThreshold", 3],
  ["highAffinityThreshold", 8],
  ["maxAmount", 200_000_000],
  ["processTypes", ["L1", "LE", "LP", "LQ", "LR"]],
  ["sweepCron", "15 */2 * * *"],
  ["dailyDigestHour", 8],
];

// ---------------------------------------------------------------- carga

async function seedSettings(): Promise<number> {
  for (const [key, value] of SETTINGS) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return SETTINGS.length;
}

/**
 * Las reglas se reemplazan enteras: son la version de docs/04, no un acumulado.
 * Solo se borran las propias (updatedBy = "seed"), para no pisar lo que el
 * Administrador haya editado desde la interfaz (RF-09).
 */
async function seedRules(): Promise<number> {
  await prisma.affinityRule.deleteMany({ where: { updatedBy: SEED_AUTHOR } });
  await prisma.affinityRule.createMany({
    data: INITIAL_RULES.map((r) => ({
      kind: r.kind,
      vertical: r.vertical ?? null,
      buyerType: r.buyerType ?? null,
      pattern: r.pattern,
      weight: r.weight,
      updatedBy: SEED_AUTHOR,
    })),
  });
  return INITIAL_RULES.length;
}

async function seedAdmin(): Promise<string | null> {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) return null;
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true },
    create: {
      id: randomUUID(),
      name: "Administrador",
      email,
      role: "ADMIN",
      emailVerified: true,
    },
  });
  return email;
}

/**
 * Las 40 candidatas del barrido del 27-08-2026.
 *
 * Todas quedan en `SeenTender`, entren o no: es lo que permite la vista previa de
 * reglas y detectar falsos negativos (docs/02). Solo las que las reglas vigentes
 * seleccionan llegan a `Tender`, para que el tablero refleje el alcance actual y
 * no muestre lo que el radar hoy descartaria (D-18).
 */
async function seedTenders(): Promise<{ seen: number; selected: number }> {
  let seen = 0;
  let selected = 0;

  for (const c of candidates) {
    const detail = details[c.codigo];
    if (!detail) continue;

    const fields = parseTenderDetail(detail);

    // Se reproducen las dos etapas del barrido (docs/04). El listado de activas
    // solo trae el nombre; la ficha, y con ella la descripcion, se pide unicamente
    // cuando el puntaje del nombre queda a un punto del umbral. Evaluar de una vez
    // sobre nombre + descripcion daria un resultado que el worker nunca produciria.
    const byName = scoreText(fields.name, INITIAL_RULES);
    const text = worthFetchingDetail(byName.score)
      ? fields.name + " " + fields.description
      : fields.name;

    const verdict = evaluate(
      { text, amount: fields.estimatedAmount, processType: fields.processType },
      INITIAL_RULES,
    );

    await prisma.seenTender.upsert({
      where: { code: fields.code },
      update: {
        name: fields.name,
        closesAt: fields.closesAt,
        portalStatus: fields.portalStatus,
        lastScore: verdict.score,
        selected: verdict.selected,
      },
      create: {
        code: fields.code,
        name: fields.name,
        closesAt: fields.closesAt,
        portalStatus: fields.portalStatus,
        lastScore: verdict.score,
        selected: verdict.selected,
      },
    });
    seen++;

    if (!verdict.selected) continue;

    const data = {
      ...fields,
      vertical: classifyVertical(text, INITIAL_RULES),
      buyerType: classifyBuyer(fields.buyerOrganism, fields.buyerUnit, INITIAL_RULES),
      incumbentSignals: detectIncumbentSignals(text, INITIAL_RULES),
      affinityScore: verdict.score,
      matchedTerms: verdict.matchedTerms,
      outOfScale: verdict.outOfScale,
      raw: asJson(detail),
    };

    await prisma.tender.upsert({
      where: { code: fields.code },
      update: { ...data, lastSyncedAt: new Date() },
      create: data,
    });
    selected++;
  }

  return { seen, selected };
}

/** 45 adjudicaciones con sus ofertas, parseadas del acta publica (docs/03). */
async function seedHistory(): Promise<{ awardCount: number; bidCount: number }> {
  let awardCount = 0;
  let bidCount = 0;

  for (const a of awards) {
    const act = acts[a.codigo];
    const detail = details[a.codigo];

    const fields = {
      name: a.nombre,
      vertical: classifyVertical(a.nombre, INITIAL_RULES),
      buyerOrganism: a.org,
      region: (a.region ?? "").trim(),
      awardedAt: a.fecha ? new Date(a.fecha) : null,
      bidderCount: a.oferentes ?? null,
      estimatedNet: firstAmount(act?.estimado_contrato, a.estimado),
      awardedNet: firstAmount(act?.adjudicado, a.monto_adj),
      ...parseDurationLabel(a.dur),
      awardActUrl: a.acta || null,
      // Solo la ficha de la API: docs/02 promete que `raw` sirve para reprocesar.
      // Guardar el resumen del seed dejaria la columna con dos formas distintas.
      raw: detail ? asJson(detail) : undefined,
    };

    // El update repite los campos para que una correccion en seed/ se propague
    // al volver a sembrar, en vez de quedar congelada en la primera carga.
    const award = await prisma.historicalAward.upsert({
      where: { code: a.codigo },
      update: fields,
      create: { code: a.codigo, ...fields },
      include: { bids: true },
    });
    awardCount++;

    if (award.bids.length === 0 && act?.ofertas?.length) {
      await prisma.historicalBid.createMany({
        data: act.ofertas.map((o) => ({
          awardId: award.id,
          supplierRut: o.rut,
          supplierName: o.nombre,
          amount: o.monto,
          // docs/03: bajo 10.000 el monto del acta es un valor unitario, no el total.
          unitPrice: o.monto < 10_000,
          result: o.estado,
        })),
      });
      bidCount += act.ofertas.length;
    }
  }
  return { awardCount, bidCount };
}

/**
 * Revisiones que el equipo ya hizo (docs/11, cierra T-12).
 *
 * Sirven para dos cosas: que el tablero nazca con historia, y que una licitacion
 * ya descartada **no vuelva a aparecer como nueva**. El barrido preserva
 * `reviewStatus` al actualizar una ficha, asi que basta con dejarla marcada una vez.
 *
 * Muchas no estan en `Tender` porque no salieron en el ultimo barrido: se piden a
 * la API. Es idempotente por la nota, que es unica por revision.
 */
async function seedReviews(): Promise<{ created: number; fetched: number; missing: string[] }> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) return { created: 0, fetched: 0, missing: revisiones.map((r) => r.codigo) };

  const known = new Set(
    (await prisma.tender.findMany({ select: { code: true } })).map((t) => t.code),
  );
  const porTraer = revisiones.filter((r) => !known.has(r.codigo));

  // El cliente solo se construye si hace falta: asi `pnpm seed` no exige la API
  // cuando todas las licitaciones ya estan cargadas.
  const client = porTraer.length
    ? new MpClient({ ticket: env.MP_API_TICKET, minIntervalMs: env.MP_MIN_INTERVAL_MS })
    : null;

  if (porTraer.length) {
    console.log(
      `  trayendo ${porTraer.length} fichas de la API para las revisiones (~${Math.round((porTraer.length * 3.5) / 60)} min)...`,
    );
  }

  let created = 0;
  let fetched = 0;
  const missing: string[] = [];

  for (const r of revisiones) {
    if (!known.has(r.codigo) && client) {
      try {
        const detail = await client.getTender<TenderDetail>(r.codigo);
        const fields = parseTenderDetail(detail);
        const text = fields.name + " " + fields.description;
        const verdict = evaluate(
          { text, amount: fields.estimatedAmount, processType: fields.processType },
          INITIAL_RULES,
        );
        await prisma.tender.create({
          data: {
            ...fields,
            vertical: classifyVertical(text, INITIAL_RULES),
            buyerType: classifyBuyer(fields.buyerOrganism, fields.buyerUnit, INITIAL_RULES),
            incumbentSignals: detectIncumbentSignals(text, INITIAL_RULES),
            affinityScore: verdict.score,
            matchedTerms: verdict.matchedTerms,
            outOfScale: verdict.outOfScale,
            raw: asJson(detail),
          },
        });
        known.add(r.codigo);
        fetched++;
      } catch (e) {
        // Una ficha que la API ya no devuelve no puede bloquear el resto.
        missing.push(r.codigo);
        console.log(`  no se pudo traer ${r.codigo}: ${String(e).slice(0, 70)}`);
        continue;
      }
    }

    const tender = await prisma.tender.findUnique({ where: { code: r.codigo } });
    if (!tender) {
      missing.push(r.codigo);
      continue;
    }

    // Idempotencia: la nota identifica la revision, no hay dos iguales.
    const yaEsta = await prisma.review.findFirst({
      where: { tenderId: tender.id, note: r.nota },
    });
    if (yaEsta) continue;

    // El estado del tablero y la revision se escriben juntos: si se separan,
    // el tablero puede quedar mostrando un estado que ninguna revision respalda.
    await prisma.$transaction([
      prisma.review.create({
        data: {
          tenderId: tender.id,
          status: r.estado,
          reasons: r.motivos,
          note: r.nota,
          userId: admin.id,
        },
      }),
      prisma.tender.update({ where: { id: tender.id }, data: { reviewStatus: r.estado } }),
    ]);
    created++;
  }

  return { created, fetched, missing };
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  console.log("Sembrando el Radar de Licitaciones...\n");

  console.log(`  ${await seedSettings()} parametros en Setting`);
  console.log(`  ${await seedRules()} reglas de afinidad (docs/04)`);

  const admin = await seedAdmin();
  console.log(admin ? `  administrador: ${admin}` : "  sin administrador (falta SEED_ADMIN_EMAIL)");

  const { seen, selected } = await seedTenders();
  console.log(`  ${seen} activas vistas, ${selected} seleccionadas por las reglas vigentes`);

  const { awardCount, bidCount } = await seedHistory();
  console.log(`  ${awardCount} adjudicaciones historicas con ${bidCount} ofertas`);

  const rev = await seedReviews();
  console.log(`  ${rev.created} revisiones del equipo (${rev.fetched} fichas traidas de la API)`);
  if (rev.missing.length) {
    console.log(`  sin cargar por falta de ficha: ${rev.missing.join(", ")}`);
  }

  console.log("\nLos puntajes son los de la version Python: seed/candidatas_2026-08-27.json");
  console.log("es la base de comparacion del motor en TypeScript (docs/11).");
  console.log("El administrador aun no tiene contrasena: la crea Better Auth (docs/09).");
}

main()
  .catch((e) => {
    console.error("\nLa semilla fallo:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
