/**
 * Secciones del resumen de los lunes (docs/17, D-51).
 *
 * `SeenTender` guarda todas las activas con su puntaje, entren o no. Una vez a
 * la semana se listan las que quedaron a un paso del umbral por los dos lados:
 *
 * - **Casi entran**: vistas no seleccionadas con puntaje entre umbral−2 y
 *   umbral−1. Un falso negativo real ahi es una regla que falta, con evidencia.
 *   Lo que ya tiene ficha no cuenta: el barrido reescribe `selected` con el
 *   puntaje del nombre solo, asi que una que entro por su descripcion (o con
 *   reglas anteriores) figura como no seleccionada con 2 y ya esta en el
 *   tablero, o alguien ya la reviso.
 * - **Entraron por poco**: nuevas del tablero con afinidad entre umbral y
 *   umbral+1. Un falso positivo ahi es una exclusion o una senal que falta.
 *
 * Diez minutos de lectura por semana. Puro a proposito: recibe las filas ya
 * cargadas para poder probarse sin base; las consultas viven en el worker.
 */
export interface LineaDigest {
  code: string;
  name: string;
  score: number;
  vertical: string;
  /** Etiquetas estructurales (docs/15). Vacio en las vistas: sin ficha no hay etiquetas. */
  tags: string[];
}

/** Tope por seccion. Mas que esto no se lee, y el correo debe exigir una accion (docs/08). */
export const MAX_LINEAS = 15;

/** Lunes en Chile, no en UTC: a las 08:00 de Chile del lunes el servidor ya va por la tarde del lunes en UTC, pero el borde importa. */
export function esLunes(fecha: Date): boolean {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", weekday: "short" }).format(fecha) === "Mon";
}

const porPuntaje = (a: { score: number; code: string }, b: { score: number; code: string }) =>
  b.score - a.score || a.code.localeCompare(b.code);

export function casiEntran(
  vistas: Array<{ code: string; name: string; lastScore: number; selected?: boolean }>,
  umbral: number,
  verticalDe: (name: string) => string,
  max: number = MAX_LINEAS,
  conFicha: ReadonlySet<string> = new Set(),
): LineaDigest[] {
  return vistas
    .filter((v) => !v.selected && !conFicha.has(v.code) && v.lastScore >= umbral - 2 && v.lastScore <= umbral - 1)
    .map((v) => ({ code: v.code, name: v.name, score: v.lastScore, vertical: verticalDe(v.name), tags: [] }))
    .sort(porPuntaje)
    .slice(0, max);
}

export function entraronPorPoco(
  fichas: Array<{
    code: string;
    name: string;
    affinityScore: number;
    vertical: string;
    structuralTags: string[];
    reviewStatus?: string;
  }>,
  umbral: number,
  max: number = MAX_LINEAS,
): LineaDigest[] {
  return fichas
    .filter((t) => (t.reviewStatus ?? "NEW") === "NEW" && t.affinityScore >= umbral && t.affinityScore <= umbral + 1)
    .map((t) => ({ code: t.code, name: t.name, score: t.affinityScore, vertical: t.vertical, tags: t.structuralTags }))
    .sort(porPuntaje)
    .slice(0, max);
}
