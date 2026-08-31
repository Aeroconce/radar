/**
 * Normalizacion de las respuestas de la API de Mercado Publico (docs/03).
 *
 * Lo usan tanto el worker como la semilla: si hubiera dos mapeos distintos,
 * los datos sembrados y los del barrido divergirian sin que nadie lo note.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { ProcessType } from "@/generated/prisma/enums";

const CHILE = "America/Santiago";

/** Instante -> hora de pared en Chile, expresada como milisegundos UTC. */
function wallClockInChile(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHILE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Algunas plataformas devuelven "24" para la medianoche.
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
}

/**
 * Las fechas de la API vienen sin zona y son hora de Chile (docs/03).
 * Chile cambia de huso dos veces al ano, asi que el desfase no es constante:
 * se resuelve por aproximacion contra la zona en vez de restar 3 o 4 fijo.
 */
export function parseChileDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  if (!m) return null;

  const target = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  let guess = target;
  // Dos pasadas bastan: la primera corrige el desfase, la segunda el salto de horario de verano.
  for (let i = 0; i < 2; i++) {
    const drift = wallClockInChile(new Date(guess)) - target;
    if (drift === 0) break;
    guess -= drift;
  }
  return new Date(guess);
}

const PROCESS_TYPES = new Set(["L1", "LE", "LP", "LQ", "LR", "LS"]);

/** `Tipo` de la API -> enum. Los que no reconocemos (CO, B2, E2...) caen en OTHER. */
export function parseProcessType(raw: unknown): ProcessType {
  const t = String(raw ?? "").trim().toUpperCase();
  return (PROCESS_TYPES.has(t) ? t : "OTHER") as ProcessType;
}

/**
 * `UnidadTiempoDuracionContrato`. docs/03 documentaba 2, 4 y 5; en los datos
 * reales aparecen ademas 0, 1 y 3. La 3 se interpreta como semanas porque sus
 * valores (10 y 36) serian absurdos en anos. El codigo crudo queda en `raw`.
 */
const DURATION_UNITS: Record<string, string> = {
  "2": "dias",
  "3": "semanas",
  "4": "meses",
  "5": "anos",
};

export function parseDuration(value: unknown, unit: unknown): {
  durationValue: number | null;
  durationUnit: string | null;
} {
  const n = Number(value);
  const label = DURATION_UNITS[String(unit)] ?? null;
  if (!Number.isFinite(n) || n <= 0 || !label) return { durationValue: null, durationUnit: null };
  return { durationValue: n, durationUnit: label };
}

/**
 * "36 m" -> { 36, "meses" }; "45 d" -> { 45, "dias" }.
 * Sin letra de unidad no se asume ninguna: el historico trae valores como "30 " y
 * suponerlos meses inventaria un dato que el origen no entrega. El valor crudo
 * queda en `HistoricalAward.raw`.
 */
export function parseDurationLabel(raw: unknown): {
  durationValue: number | null;
  durationUnit: string | null;
} {
  const m = /^(\d+)\s*([a-z])?/i.exec(String(raw ?? "").trim());
  const n = m ? Number(m[1]) : 0;
  if (!m || n <= 0) return { durationValue: null, durationUnit: null };
  const letter = m[2]?.toLowerCase();
  const unit = letter === "d" ? "dias" : letter === "m" ? "meses" : letter === "a" ? "anos" : null;
  if (!unit) return { durationValue: null, durationUnit: null };
  return { durationValue: n, durationUnit: unit };
}

/** Numero de la API -> number, tratando 0, "" y null como ausencia. */
export function parseAmount(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface TenderDetail {
  CodigoExterno?: string;
  Nombre?: string;
  Descripcion?: string;
  Tipo?: string;
  CodigoEstado?: number;
  MontoEstimado?: number | null;
  Moneda?: string;
  TiempoDuracionContrato?: number | string;
  UnidadTiempoDuracionContrato?: number | string;
  Contrato?: number | string;
  Items?: Prisma.InputJsonValue;
  Fechas?: Record<string, string | null>;
  Comprador?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Ficha completa de la API -> campos normalizados de `Tender` (docs/02).
 * No clasifica vertical, tipo de comprador ni afinidad: eso es del motor (docs/04).
 */
export function parseTenderDetail(d: TenderDetail) {
  const f = d.Fechas ?? {};
  const c = d.Comprador ?? {};
  const contrato = String(d.Contrato ?? "");

  return {
    code: String(d.CodigoExterno ?? "").trim(),
    name: String(d.Nombre ?? "").trim(),
    description: String(d.Descripcion ?? "").trim(),
    processType: parseProcessType(d.Tipo),
    buyerOrganism: String(c.NombreOrganismo ?? "").trim(),
    buyerUnit: String(c.NombreUnidad ?? "").trim(),
    buyerCode: String(c.CodigoOrganismo ?? "").trim() || null,
    region: String(c.RegionUnidad ?? "").trim(),
    estimatedAmount: parseAmount(d.MontoEstimado),
    currency: String(d.Moneda ?? "CLP").trim() || "CLP",
    ...parseDuration(d.TiempoDuracionContrato, d.UnidadTiempoDuracionContrato),
    // Interpretacion tentativa: 1 exige contrato, 2 no, 0 sin informar (docs/12 T-11).
    requiresContract: contrato === "1" ? true : contrato === "2" ? false : null,
    publishedAt: parseChileDate(f.FechaPublicacion),
    questionsUntil: parseChileDate(f.FechaFinal),
    answersAt: parseChileDate(f.FechaPubRespuestas),
    closesAt: parseChileDate(f.FechaCierre),
    awardEstimatedAt: parseChileDate(f.FechaEstimadaAdjudicacion ?? f.FechaAdjudicacion),
    portalStatus: Number.isFinite(Number(d.CodigoEstado)) ? Number(d.CodigoEstado) : null,
    items: d.Items,
  };
}
