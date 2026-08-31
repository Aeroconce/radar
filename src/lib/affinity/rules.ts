/**
 * Motor de afinidad (docs/04, RF-01 y RF-09).
 *
 * La tesis del producto: una licitacion relevante que no aparece cuesta mas que
 * veinte irrelevantes que si. Por eso el umbral es bajo y las exclusiones son
 * explicitas en vez de restrictivas.
 *
 * Las reglas no viven aqui: se leen de `AffinityRule`, que el Administrador edita
 * desde la interfaz. Este modulo solo sabe aplicarlas.
 */
import type { BuyerType, Vertical } from "@/generated/prisma/enums";

/** Forma minima de una regla. Coincide con `AffinityRule` sin los campos de auditoria. */
export interface Rule {
  kind: string;
  pattern: string;
  weight: number;
  vertical?: Vertical | null;
  buyerType?: BuyerType | null;
  active?: boolean;
}

export const RULE_KINDS = {
  KEYWORD: "KEYWORD",
  EXCLUSION: "EXCLUSION",
  BUYER_PATTERN: "BUYER_PATTERN",
  INCUMBENT_SIGNAL: "INCUMBENT_SIGNAL",
} as const;

/**
 * Minusculas y sin tildes, para que las reglas se escriban sin tildes (docs/04).
 *
 * Conserva las posiciones: quitar los diacriticos combinantes tras NFD devuelve
 * un texto del mismo largo que el original, asi que un indice de coincidencia
 * sobre el texto normalizado apunta al mismo lugar en el texto original. Eso
 * permite reportar la coincidencia tal como la escribio el comprador, con tildes.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // diacriticos combinantes
}

function compile(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    // Una regla mal escrita desde la interfaz no puede voltear el barrido entero.
    return null;
  }
}

const isActive = (r: Rule) => r.active !== false;

export interface Score {
  score: number;
  /** Coincidencias tal como aparecen en el texto original, con tildes. */
  matchedTerms: string[];
}

/**
 * Puntaje de un texto: suma de los pesos de las reglas que coinciden.
 *
 * Cada regla aporta su peso **una sola vez** aunque coincida varias veces (docs/04).
 * Los pesos ya vienen con signo: positivos las palabras clave, negativos las
 * exclusiones, asi que basta sumarlos.
 */
export function scoreText(text: string, rules: Rule[]): Score {
  const normalized = normalize(text);
  let score = 0;
  const matchedTerms: string[] = [];

  for (const rule of rules) {
    if (!isActive(rule)) continue;
    if (rule.kind !== RULE_KINDS.KEYWORD && rule.kind !== RULE_KINDS.EXCLUSION) continue;

    const re = compile(rule.pattern);
    if (!re) continue;

    const m = re.exec(normalized);
    if (!m) continue;

    score += rule.weight;
    // Se recorta del texto original: los indices coinciden porque normalize() los conserva.
    if (rule.kind === RULE_KINDS.KEYWORD) {
      matchedTerms.push(text.slice(m.index, m.index + m[0].length));
    }
  }

  return { score, matchedTerms };
}

export interface Thresholds {
  /** Puntaje minimo para entrar al tablero. Inicial 3 (docs/04). */
  affinityThreshold: number;
  /** Monto sobre el cual se marca "fuera de escala". Inicial 200.000.000. */
  maxAmount: number;
  /** Tipos de proceso que se seleccionan. LS queda fuera (docs/12 D-15). */
  processTypes: string[];
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  affinityThreshold: 3,
  maxAmount: 200_000_000,
  processTypes: ["L1", "LE", "LP", "LQ", "LR"],
};

/** Penalizacion de afinidad de las que superan el monto maximo (docs/04). */
export const OUT_OF_SCALE_PENALTY = 2;

export interface Evaluation extends Score {
  /** Supera el monto maximo: se lista igual, con etiqueta y menos afinidad. */
  outOfScale: boolean;
  /** Entra al tablero. */
  selected: boolean;
}

/**
 * Evaluacion completa de una licitacion.
 *
 * Un monto sobre el maximo **no la descarta**: la marca `outOfScale` y le resta
 * afinidad, porque una licitacion grande sigue siendo informacion util (docs/04).
 * Un tipo de proceso fuera de lista si la descarta.
 */
export function evaluate(
  input: { text: string; amount?: number | null; processType?: string | null },
  rules: Rule[],
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): Evaluation {
  const { score: base, matchedTerms } = scoreText(input.text, rules);

  const outOfScale = typeof input.amount === "number" && input.amount > thresholds.maxAmount;
  const score = outOfScale ? base - OUT_OF_SCALE_PENALTY : base;

  const typeAllowed =
    !input.processType || thresholds.processTypes.includes(input.processType);

  return {
    score,
    matchedTerms,
    outOfScale,
    selected: typeAllowed && score >= thresholds.affinityThreshold,
  };
}

/**
 * Si conviene pedir la ficha para recalcular con la descripcion.
 *
 * El listado de activas solo trae el nombre. Cuando el puntaje queda a un punto
 * del umbral, la descripcion puede inclinarlo: vale la llamada extra a la API (docs/04).
 */
export function worthFetchingDetail(score: number, thresholds: Thresholds = DEFAULT_THRESHOLDS): boolean {
  return score >= thresholds.affinityThreshold - 1;
}
