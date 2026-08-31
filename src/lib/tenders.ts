/**
 * Como se muestran los campos de una licitacion.
 *
 * Vive aparte porque el tablero, las favoritas y la ficha muestran lo mismo: si
 * cada pantalla tuviera su copia, terminarian diciendo cosas distintas del mismo
 * dato.
 */

/** Nombre legible de cada vertical (RF-03). */
export const VERTICALES: Record<string, string> = {
  APPOINTMENTS: "Citas y contactabilidad",
  FIXED_ASSETS: "Activos fijos",
  DOCUMENT_MGMT: "Gestión documental",
  QUALITY_ACCREDITATION: "Calidad y acreditación",
  WEB_DEVELOPMENT: "Desarrollo web y plataformas",
  OTHER: "Otros",
};

/** Tramo en UTM de cada tipo de proceso, para no mostrar la sigla cruda. */
export const PROCESOS: Record<string, string> = {
  L1: "L1 · menor a 100 UTM",
  LE: "LE · entre 100 y 1.000 UTM",
  LP: "LP · entre 1.000 y 5.000 UTM",
  LQ: "LQ · entre 5.000 y 10.000 UTM",
  LR: "LR · sobre 10.000 UTM",
  LS: "LS · servicios personales",
  OTHER: "otro tipo",
};

/** Tipo de comprador (RF-03). */
export const COMPRADORES: Record<string, string> = {
  HOSPITAL: "Hospital",
  HEALTH_SERVICE: "Servicio de salud",
  MUNICIPAL_HEALTH: "Salud municipal",
  MUNICIPALITY: "Municipio",
  HIGHER_EDUCATION: "Universidad o CFT",
  PUBLIC_SERVICE: "Servicio público",
  OTHER: "Otro",
};

export const nombreVertical = (v: string) => VERTICALES[v] ?? v;
export const nombreProceso = (p: string) => PROCESOS[p] ?? p;
export const nombreComprador = (c: string) => COMPRADORES[c] ?? c;

/**
 * Dias que faltan para una fecha.
 *
 * Fuera de cualquier componente: el compilador de React trata `Date.now()` en el
 * cuerpo de uno como impuro, y tiene razon.
 */
export function diasPara(d: Date | null): number | null {
  return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

/** Texto corto del plazo, para una celda de tabla. */
export function textoPlazo(d: number | null): string {
  if (d === null) return "sin fecha";
  if (d < 0) return "cerrada";
  if (d === 0) return "hoy";
  return `${d} ${d === 1 ? "día" : "días"}`;
}

/** Rojo bajo 2 dias, ambar bajo 5, neutro el resto (docs/06). */
export function colorPlazo(d: number | null): string {
  if (d === null || d < 0) return "text-neutral-400";
  if (d <= 2) return "text-red-700";
  if (d <= 5) return "text-amber-700";
  return "text-neutral-600";
}
