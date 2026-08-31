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

/**
 * Un motivo tiene rotulo y explicacion.
 *
 * Los textos de docs/07 son frases completas: sirven para entender el motivo,
 * no para reconocerlo de un vistazo entre catorce. El rotulo es lo que se lee
 * al escanear la lista; la explicacion, lo que despeja la duda.
 */
export interface Motivo {
  codigo: string;
  /** Dos o tres palabras, para escanear. */
  rotulo: string;
  /** La frase de docs/07, para entender. */
  texto: string;
}

/** Por que no se sigue (docs/07). */
export const MOTIVOS_DESCARTE: Motivo[] = [
  { codigo: "EXP_MIN", rotulo: "Experiencia mínima", texto: "Exige contratos o años como requisito habilitante" },
  { codigo: "EXP_PESO", rotulo: "Experiencia con peso", texto: "Pesa alto en la evaluación y no podemos acreditarla" },
  { codigo: "CERT_ISO", rotulo: "Certificación ISO", texto: "Exige ISO 27001 u otra norma" },
  { codigo: "CERT_INTEROP", rotulo: "Interoperabilidad", texto: "Exige HL7, CENS o el HIS del comprador" },
  { codigo: "INTEG_ACRED", rotulo: "Integraciones acreditadas", texto: "ClaveÚnica, FirmaGob, DocDigital, PISEE, Rayen, TrakCare, AVIS" },
  { codigo: "PRODUCTO_NICHO", rotulo: "Producto de nicho", texto: "ERP municipal, farmacia, LOD certificado, biometría" },
  { codigo: "INCUMBENTE", rotulo: "Proveedor instalado", texto: "Bases escritas alrededor del proveedor actual" },
  { codigo: "PLAZO", rotulo: "Plazo incompatible", texto: "De implementación o de cierre" },
  { codigo: "MONTO", rotulo: "Monto fuera de rango", texto: "Muy bajo para el esfuerzo, o fuera de escala" },
  { codigo: "FORMA_PAGO", rotulo: "Forma de pago", texto: "Documento tributario incompatible con el vehículo" },
  { codigo: "GARANTIA", rotulo: "Garantías", texto: "Exigencias financieras fuera de alcance" },
  { codigo: "HARDWARE", rotulo: "Hardware o terreno", texto: "Incluye equipos, instalación o insumos" },
  { codigo: "SIN_TIEMPO", rotulo: "Sin tiempo", texto: "No alcanza para una oferta de calidad" },
  { codigo: "OTRO", rotulo: "Otro", texto: "Detallar en la nota" },
];

/** Por que sí se sigue (docs/07). */
export const MOTIVOS_VIABILIDAD: Motivo[] = [
  { codigo: "FIT_PRODUCTO", rotulo: "Calza con un producto", texto: "Indicar cuál en la nota" },
  { codigo: "FIT_DESARROLLO", rotulo: "Desarrollo a medida", texto: "Dentro de nuestras capacidades" },
  { codigo: "SIN_EXP_MIN", rotulo: "Sin mínimo de experiencia", texto: "No hay requisito excluyente" },
  { codigo: "EXP_PESO_BAJO", rotulo: "Experiencia pesa poco", texto: "Peso bajo o nulo en la evaluación" },
  { codigo: "PRECIO_COMPETITIVO", rotulo: "Precio competitivo", texto: "Podemos competir" },
  { codigo: "MANDANTE_FAVORABLE", rotulo: "Comprador favorable", texto: "Persona natural, boleta, desarrollos pequeños" },
];

const TODOS = [...MOTIVOS_DESCARTE, ...MOTIVOS_VIABILIDAD];
const POR_CODIGO = new Map(TODOS.map((m) => [m.codigo, m]));

/** Rotulo de un codigo. Devuelve el codigo si no esta en el catalogo, en vez de vacio. */
export const rotuloMotivo = (codigo: string): string => POR_CODIGO.get(codigo)?.rotulo ?? codigo;

/** Explicacion completa, para el titulo emergente y la bitacora. */
export const textoMotivo = (codigo: string): string => POR_CODIGO.get(codigo)?.texto ?? codigo;

export const esMotivoValido = (codigo: string): boolean => POR_CODIGO.has(codigo);

/** Que motivos se ofrecen para cada estado. Los demas no piden ninguno. */
export function motivosPara(estado: ReviewStatus): Motivo[] {
  if (estado === "DISCARDED" || estado === "LOST") return MOTIVOS_DESCARTE;
  if (estado === "VIABLE" || estado === "SUBMITTED" || estado === "AWARDED") return MOTIVOS_VIABILIDAD;
  return [];
}

/*
 * Sin exigencias (D-33). La version original obligaba a un motivo y una nota de
 * 20 caracteres al marcar VIABLE o DISCARDED. Se quito por decision del usuario:
 * el equipo son tres personas que se explican por WhatsApp, y un formulario que
 * exige escribir lo que ya se converso solo produce notas de relleno. Los
 * motivos y la nota siguen ahi para quien quiera dejarlos.
 */
