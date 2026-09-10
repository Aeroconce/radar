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
  ATTENDANCE: "Control de asistencia",
  MAINTENANCE: "Gestión de mantenimiento",
  PHARMA_LOGISTICS: "Droguería y bodega farmacéutica",
  WEB_DEVELOPMENT: "Desarrollo web y plataformas",
  OTHER: "Otros",
};

/**
 * `CodigoEstado` del portal (docs/03, docs/17). La unica viva es Publicada; el
 * resto ya no admite ofertas, aunque el equipo la tenga en revision (D-50).
 */
export const ESTADOS_PORTAL: Record<number, string> = {
  5: "Publicada",
  6: "Cerrada",
  7: "Desierta",
  8: "Adjudicada",
  18: "Revocada",
  19: "Suspendida",
};

export const PORTAL_PUBLICADA = 5;

export const nombreEstadoPortal = (s: number | null) =>
  s === null ? "" : (ESTADOS_PORTAL[s] ?? `estado ${s} del portal`);

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

/** Tramos de monto para filtrar (RF-04). El filtro real esta en tablero-filtros. */
export const TRAMOS_MONTO: Array<{ clave: string; etiqueta: string }> = [
  { clave: "hasta-10", etiqueta: "Hasta $10 M" },
  { clave: "10-50", etiqueta: "$10 M a $50 M" },
  { clave: "50-200", etiqueta: "$50 M a $200 M" },
  { clave: "sobre-200", etiqueta: "Sobre $200 M" },
  { clave: "sin-monto", etiqueta: "Sin monto publicado" },
];

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
