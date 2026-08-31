/**
 * Clasificacion de licitaciones (docs/04, RF-03).
 *
 * Tres decisiones independientes del puntaje: a que vertical pertenece, que tipo
 * de comprador la publica, y si el texto delata a un proveedor instalado.
 *
 * Como en `rules.ts`, las reglas se leen de `AffinityRule` y este modulo solo las aplica.
 */
import type { BuyerType, Vertical } from "@/generated/prisma/enums";
import { RULE_KINDS, normalize, type Rule } from "./rules";

function compile(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

const isActive = (r: Rule) => r.active !== false;

/**
 * Vertical de una licitacion: la de la regla de mayor peso que coincida.
 *
 * Las reglas de peso bajo son genericas ("software", "sistema") y coinciden casi
 * siempre; tomar la de mayor peso hace que gane la mas especifica. Sin coincidencias
 * especificas queda OTHER, que es tambien la vertical de las reglas genericas.
 *
 * Los empates de peso los resuelve el orden de las reglas: gana la primera. Por eso
 * "Desarrollo sistema de gestion documental" queda en DOCUMENT_MGMT y no en
 * WEB_DEVELOPMENT, que pesa lo mismo pero viene despues en la tabla de docs/04.
 */
export function classifyVertical(text: string, rules: Rule[]): Vertical {
  const normalized = normalize(text);
  let best: { vertical: Vertical; weight: number } | null = null;

  for (const rule of rules) {
    if (!isActive(rule)) continue;
    if (rule.kind !== RULE_KINDS.KEYWORD || !rule.vertical) continue;
    if (best && rule.weight <= best.weight) continue;

    const re = compile(rule.pattern);
    if (re?.test(normalized)) best = { vertical: rule.vertical, weight: rule.weight };
  }

  return best?.vertical ?? "OTHER";
}

/**
 * Tipo de comprador, evaluando sobre el organismo y la unidad (docs/04).
 *
 * El orden importa: las reglas se prueban en el orden en que vienen y gana la
 * primera, porque los patrones se solapan a proposito. "Hospital ... de la
 * Municipalidad de X" es un hospital, no un municipio, y HOSPITAL va antes.
 * Sin coincidencias es un servicio publico cualquiera.
 */
export function classifyBuyer(organism: string, unit: string, rules: Rule[]): BuyerType {
  const haystack = normalize(`${organism} ${unit}`);

  for (const rule of rules) {
    if (!isActive(rule)) continue;
    if (rule.kind !== RULE_KINDS.BUYER_PATTERN || !rule.buyerType) continue;

    const re = compile(rule.pattern);
    if (re?.test(haystack)) return rule.buyerType;
  }

  return "PUBLIC_SERVICE";
}

/**
 * Frases que sugieren un proveedor instalado (docs/04).
 *
 * No restan puntaje: se muestran como etiqueta para que quien revise sepa que
 * puede estar leyendo unas bases escritas alrededor de otro proveedor. La decision
 * es de la persona, no del sistema.
 */
export function detectIncumbentSignals(text: string, rules: Rule[]): string[] {
  const normalized = normalize(text);
  const found: string[] = [];

  for (const rule of rules) {
    if (!isActive(rule)) continue;
    if (rule.kind !== RULE_KINDS.INCUMBENT_SIGNAL) continue;

    const re = compile(rule.pattern);
    if (!re) continue;

    // Una senal puede aparecer varias veces con palabras distintas: interesan todas.
    for (const m of normalized.matchAll(new RegExp(rule.pattern, "gi"))) {
      const term = text.slice(m.index, m.index + m[0].length);
      if (!found.includes(term)) found.push(term);
    }
  }

  return found;
}
