/**
 * Senales estructurales de la ficha (docs/15, D-41; RF-01).
 *
 * El motor de texto puntua palabras. Pero la ficha trae cuatro datos que en la
 * muestra de septiembre de 2026 separaron viables de trampas con mas precision
 * que cualquier palabra: monto, duracion, tipo de proceso e items. Aqui se
 * convierten en un puntaje entero y una lista de etiquetas que se suman al
 * puntaje de texto: `affinityScore = textScore + structuralScore`.
 *
 * Solo se calcula cuando hay ficha: el listado de activas no trae monto ni
 * items. Es puro a proposito, como `rules.ts`: recibe los campos y los
 * parametros para poder probarse sin base de datos, y para que la vista previa
 * de reglas siga mostrando solo lo que las reglas de texto hacen, sin mezclar.
 */
import { normalize } from "./rules";

export interface StructuralParams {
  /** Banda de canon mensual implicito, en pesos. Dentro suma 2; fuera resta 2. */
  canonMin: number;
  canonMax: number;
  /** Cuanto resta un proceso LR (sobre 5.000 UTM). */
  lrPenalty: number;
  /**
   * Cuanto resta una ficha sin ningun item de software ni servicios informaticos.
   * Vale lo mismo que una exclusion de texto (D-45): si el comprador no clasifico
   * nada como software, no lo es.
   */
  noSoftwareItemPenalty: number;
}

/**
 * Valores de docs/15. Viven en `Setting` para ajustarlos con datos, igual que
 * el umbral: bajo la banda es reventa de licencia (ITAM de JUNAEB $0,6M, UFRO
 * $0,7M); sobre la banda con texto de sistema es ERP de incumbente o sistema
 * critico (Bulnes $7,6M, Estacion Central $17M).
 */
export const DEFAULT_STRUCTURAL: StructuralParams = {
  canonMin: 800_000,
  canonMax: 3_500_000,
  lrPenalty: 2,
  // 6 desde D-45: con 4, los sensores de temperatura de Arica (1075963-403-L126)
  // sumaban 12 por texto y se quedaban en 6 pese a no tener ningun item de software.
  noSoftwareItemPenalty: 6,
};

export interface StructuralInput {
  name: string;
  description: string;
  estimatedAmount: number | null;
  durationValue: number | null;
  durationUnit: string | null;
  processType: string | null;
  /** `Items` tal como lo guarda `Tender.items` (el objeto con `Listado`), o el listado directo. */
  items: unknown;
  /** Frases de `detectOpportunitySignals` (D-40). */
  opportunitySignals: string[];
}

export interface Structural {
  score: number;
  tags: string[];
}

/**
 * Duracion en meses. `null` cuando no hay dato: compra unica o ficha incompleta.
 *
 * Las unidades son las que entrega `parseDuration` (docs/03): dias, semanas,
 * meses y anos. Semanas no estaba en docs/15, pero la API la devuelve (codigo 3)
 * y sin convertirla un contrato de 36 semanas pareceria de 36 meses.
 */
export function mesesDe(durationValue: number | null, durationUnit: string | null): number | null {
  if (!durationValue || durationValue <= 0) return null;
  switch (durationUnit) {
    case "dias":
      return durationValue / 30;
    case "semanas":
      return durationValue / 4.33;
    case "anos":
      return durationValue * 12;
    default:
      return durationValue; // meses
  }
}

/** Canon mensual implicito: el monto total repartido en los meses del contrato. */
export function canonMensual(
  estimatedAmount: number | null,
  durationValue: number | null,
  durationUnit: string | null,
): number | null {
  const meses = mesesDe(durationValue, durationUnit);
  if (estimatedAmount === null || estimatedAmount <= 0 || meses === null) return null;
  return estimatedAmount / meses;
}

/**
 * Categorias de los items, normalizadas. Vacio si la ficha no trae items.
 *
 * Cada item trae `Categoria` como ruta: "Tecnologias de la informacion,
 * telecomunicaciones y radiodifusion / Software / Software de gestion". Es la
 * senal mas barata y mas fuerte: el comprador clasifica lo que compra, y casi
 * nunca se equivoca.
 */
export function categoriasDe(items: unknown): string[] {
  const listado = Array.isArray(items) ? items : (items as { Listado?: unknown } | null)?.Listado;
  if (!Array.isArray(listado)) return [];
  return listado
    .map((i) => normalize(String((i as { Categoria?: unknown })?.Categoria ?? "")))
    .filter((c) => c.length > 0);
}

const SOFTWARE_CATS = [
  /^tecnologias de la informacion.*\/ software/,
  /servicios informaticos/,
  /ingenieria en computacion e informatica/,
];

const HARDWARE_CATS = [
  /^equipos/,
  /computadores/,
  /^muebles/,
  /^vehiculos/,
  /^ropa/,
  /deportivos/,
  /^seguros/,
  /publicidad/,
  /instrumentos/,
];

/** "DE ACUERDO A REQUERIMIENTO ADJUNTO": el texto no dice nada y hay que abrir las bases si o si. */
const SIN_DESCRIPCION = /requerimiento adjunto|segun (bases|anexo)s? adjunt|ver (anexo|adjunto)/;

export function computeStructural(t: StructuralInput, p: StructuralParams = DEFAULT_STRUCTURAL): Structural {
  let score = 0;
  const tags: string[] = [];

  // Canon mensual. Sin monto no hay canon: la senal se omite, no penaliza
  // (la API deja el monto vacio a veces: Sotero del Rio, Aconcagua).
  const canon = canonMensual(t.estimatedAmount, t.durationValue, t.durationUnit);
  if (canon !== null) {
    if (canon >= p.canonMin && canon <= p.canonMax) {
      score += 2;
      tags.push("canon ok");
    } else {
      score -= 2;
      tags.push(`canon ${(canon / 1e6).toFixed(1)}M`);
    }
  }

  // Tipo de proceso. Las cuatro LR de la muestra fueron integrales o criticas.
  // No se excluye: se resta y se etiqueta, porque un LR de modulo unico puede existir.
  if (t.processType === "LR") {
    score -= p.lrPenalty;
    tags.push("LR");
  }

  // Compra unica: "adquisicion" sin duracion es un bien. Exige AMBAS condiciones:
  // Alto Hospicio se llamaba "Adquisicion de Sistema de Control de Asistencia" y
  // era arriendo a 24 meses; la duracion lo salva.
  if (mesesDe(t.durationValue, t.durationUnit) === null && /adquisicion/.test(normalize(t.name))) {
    score -= 2;
    tags.push("compra unica");
  }

  const cats = categoriasDe(t.items);
  if (cats.length > 0 && !cats.some((c) => SOFTWARE_CATS.some((r) => r.test(c)))) {
    score -= p.noSoftwareItemPenalty;
    tags.push("sin item de software");
  }
  if (cats.some((c) => HARDWARE_CATS.some((r) => r.test(c)))) {
    score -= 2;
    tags.push("item de bienes");
  }

  // "Integral" en el NOMBRE es la firma de la plataforma de incumbente o del
  // servicio que lo abarca todo (D-45): el "SERVICIO TECNOLOGICO INTEGRAL RED
  // REGIONAL" de Subtrans pasaba con 7. Solo sobre el nombre, nunca sobre la
  // descripcion: Alto Hospicio (3447-142-LE26) dice "solucion integral" en la
  // descripcion y es viable.
  if (/\bintegral\b/.test(normalize(t.name))) {
    score -= 2;
    tags.push("integral");
  }

  // No resta: etiqueta. UFRO decia "DE ACUERDO A REQUERIMIENTO ADJUNTO" y
  // puntuaba 11 solo por el nombre.
  if (SIN_DESCRIPCION.test(normalize(t.description))) {
    tags.push("sin descripcion util");
  }

  // Las senales de oportunidad no puntuan por regla (D-40), pero aqui si.
  const senales = t.opportunitySignals.map(normalize);
  if (senales.some((s) => /menor tamano|\bemt\b|182/.test(s))) {
    score += 2;
    tags.push("reservada EMT");
  }
  if (senales.some((s) => /llamado|desierta|sin efecto/.test(s))) {
    score += 1;
    tags.push("relanzamiento");
  }

  return { score, tags };
}
