/**
 * Estados, motivos y reglas de una revision (docs/07, RF-06).
 *
 * El catalogo vive en codigo, no en la base: es fijo por diseno. `Review.reasons`
 * guarda los codigos, y aqui estan sus textos y a que estados aplican.
 */
import type { ReviewStatus } from "@/generated/prisma/enums";

export const ESTADOS: Record<ReviewStatus, { etiqueta: string; color: string }> = {
  NEW: { etiqueta: "Nueva", color: "bg-blue-50 text-blue-800 ring-blue-200" },
  IN_REVIEW: { etiqueta: "En revisión", color: "bg-amber-50 text-amber-900 ring-amber-200" },
  VIABLE: { etiqueta: "Viable", color: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  DISCARDED: { etiqueta: "Descartada", color: "bg-neutral-100 text-neutral-700 ring-neutral-300" },
  SUBMITTED: { etiqueta: "Ofertada", color: "bg-violet-50 text-violet-800 ring-violet-200" },
  AWARDED: { etiqueta: "Adjudicada", color: "bg-emerald-100 text-emerald-900 ring-emerald-300" },
  LOST: { etiqueta: "Perdida", color: "bg-red-50 text-red-800 ring-red-200" },
};

/** Orden de lectura: lo que espera trabajo primero, lo cerrado al final. */
export const ORDEN_ESTADOS: ReviewStatus[] = [
  "NEW",
  "IN_REVIEW",
  "VIABLE",
  "SUBMITTED",
  "AWARDED",
  "LOST",
  "DISCARDED",
];

export interface Motivo {
  codigo: string;
  texto: string;
}

/** Por que no se sigue (docs/07). */
export const MOTIVOS_DESCARTE: Motivo[] = [
  { codigo: "EXP_MIN", texto: "Exige experiencia mínima (contratos o años) como requisito" },
  { codigo: "EXP_PESO", texto: "Experiencia con peso alto en la evaluación sin poder acreditarla" },
  { codigo: "CERT_ISO", texto: "Exige certificación ISO 27001 u otra norma" },
  { codigo: "CERT_INTEROP", texto: "Exige certificación de interoperabilidad (HL7, CENS, HIS del comprador)" },
  { codigo: "INTEG_ACRED", texto: "Exige integraciones acreditadas (ClaveÚnica, FirmaGob, DocDigital, PISEE, Rayen, TrakCare, AVIS)" },
  { codigo: "PRODUCTO_NICHO", texto: "Requiere un producto especializado existente (ERP municipal, farmacia, LOD certificado, biometría)" },
  { codigo: "INCUMBENTE", texto: "Bases escritas alrededor del proveedor actual" },
  { codigo: "PLAZO", texto: "Plazo de implementación o de cierre incompatible" },
  { codigo: "MONTO", texto: "Monto fuera de rango" },
  { codigo: "FORMA_PAGO", texto: "Documento tributario o forma de pago incompatible" },
  { codigo: "GARANTIA", texto: "Garantías o exigencias financieras fuera de alcance" },
  { codigo: "HARDWARE", texto: "Incluye hardware, instalación en terreno o insumos" },
  { codigo: "SIN_TIEMPO", texto: "Sin tiempo para preparar una oferta de calidad" },
  { codigo: "OTRO", texto: "Otro (detallar en la nota)" },
];

/** Por que sí se sigue (docs/07). */
export const MOTIVOS_VIABILIDAD: Motivo[] = [
  { codigo: "FIT_PRODUCTO", texto: "Calza con un producto existente (indicar cuál en la nota)" },
  { codigo: "FIT_DESARROLLO", texto: "Desarrollo a medida dentro de nuestras capacidades" },
  { codigo: "SIN_EXP_MIN", texto: "Sin mínimo de experiencia excluyente" },
  { codigo: "EXP_PESO_BAJO", texto: "Experiencia con peso bajo o nulo" },
  { codigo: "PRECIO_COMPETITIVO", texto: "Podemos ser competitivos en precio" },
  { codigo: "MANDANTE_FAVORABLE", texto: "Comprador con historial favorable (persona natural, boleta, desarrollos pequeños)" },
];

const TODOS = [...MOTIVOS_DESCARTE, ...MOTIVOS_VIABILIDAD];
const POR_CODIGO = new Map(TODOS.map((m) => [m.codigo, m]));

/** Texto de un codigo. Devuelve el codigo si no esta en el catalogo, en vez de vacio. */
export const textoMotivo = (codigo: string): string => POR_CODIGO.get(codigo)?.texto ?? codigo;

export const esMotivoValido = (codigo: string): boolean => POR_CODIGO.has(codigo);

/** Que motivos se ofrecen para cada estado. Los demas no piden ninguno. */
export function motivosPara(estado: ReviewStatus): Motivo[] {
  if (estado === "DISCARDED" || estado === "LOST") return MOTIVOS_DESCARTE;
  if (estado === "VIABLE" || estado === "SUBMITTED" || estado === "AWARDED") return MOTIVOS_VIABILIDAD;
  return [];
}

/** Largo minimo de la nota cuando se exige (docs/07). */
export const NOTA_MINIMA = 20;

/**
 * Estados que no se pueden guardar sin al menos un motivo y una nota de 20
 * caracteres: son los que cierran una decision y tienen que dejar el porque.
 */
export const EXIGEN_JUSTIFICACION: ReviewStatus[] = ["VIABLE", "DISCARDED"];

export interface ProblemaRevision {
  campo: "motivos" | "nota";
  mensaje: string;
}

/** Valida una revision segun docs/07. Devuelve los problemas, vacio si esta bien. */
export function validarRevision(input: {
  estado: ReviewStatus;
  motivos: string[];
  nota: string;
}): ProblemaRevision[] {
  const problemas: ProblemaRevision[] = [];
  if (!EXIGEN_JUSTIFICACION.includes(input.estado)) return problemas;

  if (input.motivos.length === 0) {
    problemas.push({ campo: "motivos", mensaje: "Marca al menos un motivo." });
  }
  if (input.nota.trim().length < NOTA_MINIMA) {
    problemas.push({
      campo: "nota",
      mensaje: `La nota necesita al menos ${NOTA_MINIMA} caracteres: es la memoria de por qué se decidió esto.`,
    });
  }
  return problemas;
}
