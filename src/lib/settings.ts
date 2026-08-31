/**
 * Parametros y reglas, leidos de la base (RF-09).
 *
 * Umbral, monto maximo y tipos de proceso viven en `Setting`, y las reglas en
 * `AffinityRule`, porque el Administrador los edita desde la interfaz. El motor
 * no los conoce: se los pasa quien lo invoca.
 *
 * Si un parametro falta o quedo con un valor imposible se usa el de `docs/04`,
 * en vez de dejar el barrido sin umbral y que seleccione todo.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_THRESHOLDS, type Rule, type Thresholds } from "@/lib/affinity/rules";

export const SETTING_KEYS = {
  affinityThreshold: "affinityThreshold",
  highAffinityThreshold: "highAffinityThreshold",
  maxAmount: "maxAmount",
  processTypes: "processTypes",
} as const;

/** Umbral a partir del cual una licitacion nueva dispara aviso (docs/05). */
export const DEFAULT_HIGH_AFFINITY = 8;

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return list.length > 0 ? list : fallback;
}

export interface RadarSettings extends Thresholds {
  highAffinityThreshold: number;
}

export async function loadSettings(): Promise<RadarSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  return {
    affinityThreshold: asPositiveInt(
      byKey.get(SETTING_KEYS.affinityThreshold),
      DEFAULT_THRESHOLDS.affinityThreshold,
    ),
    highAffinityThreshold: asPositiveInt(
      byKey.get(SETTING_KEYS.highAffinityThreshold),
      DEFAULT_HIGH_AFFINITY,
    ),
    maxAmount: asPositiveInt(byKey.get(SETTING_KEYS.maxAmount), DEFAULT_THRESHOLDS.maxAmount),
    processTypes: asStringList(
      byKey.get(SETTING_KEYS.processTypes),
      DEFAULT_THRESHOLDS.processTypes,
    ),
  };
}

/** Solo las reglas activas: desactivar una en la interfaz debe surtir efecto ya. */
export async function loadRules(): Promise<Rule[]> {
  const rows = await prisma.affinityRule.findMany({ where: { active: true } });
  return rows.map((r) => ({
    kind: r.kind,
    pattern: r.pattern,
    weight: r.weight,
    vertical: r.vertical,
    buyerType: r.buyerType,
    active: r.active,
  }));
}
