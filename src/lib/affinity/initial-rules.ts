/**
 * Reglas iniciales de afinidad, transcritas de docs/04.
 *
 * Son la version de partida: la semilla las carga en `AffinityRule` y desde ahi
 * el Administrador las edita (RF-09). Las pruebas las usan como fixture, para que
 * lo que se prueba sea exactamente lo que se siembra.
 *
 * Las expresiones se escriben **sin tildes**: el motor normaliza el texto antes
 * de evaluar (`normalize` en rules.ts).
 */
import type { BuyerType, Vertical } from "@/generated/prisma/enums";
import { RULE_KINDS, type Rule } from "./rules";

const KEYWORDS: Array<[Vertical, number, string]> = [
  [
    "APPOINTMENTS",
    6,
    "agendamiento|confirmacion de (citas|horas)|recordatorio|whatsapp|chatbot|reserva de horas|contactabilidad|inasistencia",
  ],
  [
    "FIXED_ASSETS",
    6,
    "activos? fijos?|gestion de activos|control de inventario|bienes de uso|inventario",
  ],
  [
    "QUALITY_ACCREDITATION",
    6,
    "acreditacion|seguridad del paciente|eventos adversos|autorizacion sanitaria|gestion de calidad",
  ],
  [
    "DOCUMENT_MGMT",
    5,
    "gestion documental|archivo digital|digitalizacion|documentos electronicos|expediente|oficina de partes|gestor documental",
  ],
  [
    "WEB_DEVELOPMENT",
    5,
    "desarrollo (de )?(sistema|software|plataforma|aplicaci|sitio|portal|web)|sistema informatico|plataforma (web|digital|informatica|tecnol)|aplicacion (web|movil)|app movil|sitio web|pagina web|portal web|sistema de gestion|sistemas? de informacion|sistema de (registro|control|seguimiento)|plataforma para|solucion informatica",
  ],
  [
    "WEB_DEVELOPMENT",
    4,
    "saas|arriendo (de )?software|licenciamiento de sistema|software (de|para|cloud|en)|implementacion (de )?software|servicio de software|solucion tecnol",
  ],
  // Solo terminos que describen un sistema. Salieron "encuesta", "oirs", "tramites",
  // "automatizacion" y "transparencia": nombran un tramite, una oficina o un aparato,
  // y traian al tablero encuestas, ascensores y portones (docs/12 D-18).
  // "integracion" pide contexto de sistemas: sola matcheaba "Centro de Integracion
  // del Adulto Mayor".
  [
    "OTHER",
    3,
    "mesa de ayuda|help ?desk|tickets|intranet|extranet|dashboard|reporteria|interoperab|integracion (de |con )?(sistema|plataforma|dato|api|servicio)|tramite digital|e-?learning",
  ],
  ["OTHER", 2, "informatic[oa]|digital|tecnologic|software|web|aplicacion|sistema"],
];

/** Peso de cada exclusion. Negativo: se suma como los demas (docs/04). */
export const EXCLUSION_WEIGHT = -6;

/**
 * Ojo con los limites de palabra. `curso` sin `\b` matchea dentro de "recursos",
 * y bajaba 6 puntos a licitaciones de desarrollo por una frase tan comun como
 * "los recursos involucrados": 5 de las 87 fichas de la semilla. `ups` haria lo
 * mismo dentro de "backups". Los demas terminos son prefijos a proposito
 * (`interoperab`, `climatizaci`, `solucion tecnol`) y no llevan limite.
 */
const EXCLUSIONS: string[] = [
  "impresor|computador|notebook|equipamiento computacional|switch|\\bups\\b|hardware|camara|cctv|telefonia|internet|enlace|fibra",
  "licencias? .*(microsoft|office|adobe|windows|antivirus|autocad|autodesk|archicad|arcgis|matlab|sap|oracle|vmware|fortinet|veeam)|renovacion .*licencias|suscripcion .*(software|licencias)",
  "toner|insumos|reactivos|equipos de laboratorio|banco de sangre",
  "\\bcurso|capacitacion en|diplomado|taller|asesoria|consultoria|levantamiento|inventario (fisico|de bienes)|regularizacion del activo|actualizacion activo fijo|monitoreo ambiental|digitalizacion masiva|servicio de digitalizacion|impresion|imprenta|senaletica|diseno grafico",
  "sistema de (riego|alarma|climatizaci|aire|iluminaci|extinci|calefacci|audio|sonido|bombeo|seguridad electr|control de acceso|deteccion|vigilancia)|sistema electrico|sistema fotovoltaico",
  "remuneraciones|gdp|forense|erp municipal|software integral .*municipal",
];

/**
 * El orden importa: gana la primera que coincide. Los patrones se solapan a
 * proposito, y un hospital dependiente de un municipio sigue siendo un hospital.
 */
const BUYER_PATTERNS: Array<[BuyerType, string]> = [
  ["HOSPITAL", "hospital|instituto nacional|clinica"],
  ["HEALTH_SERVICE", "servicio de salud|s\\.s\\.|red asistencial|crs |cesfam"],
  ["MUNICIPAL_HEALTH", "direccion de salud|departamento de salud|das |corporacion municipal"],
  ["MUNICIPALITY", "municipalidad|i\\. municipalidad|ilustre"],
  ["HIGHER_EDUCATION", "universidad|centro de formacion tecnica|cft|instituto profesional"],
];

const INCUMBENT_SIGNALS =
  "continuar|continuidad|actualmente (en uso|utilizado)|sistema actual|migracion|renovacion|renovar|proveedor actual";

/** Marca de autoria en `AffinityRule.updatedBy`: la semilla solo reemplaza las suyas. */
export const SEED_AUTHOR = "seed";

export const INITIAL_RULES: Rule[] = [
  ...KEYWORDS.map(([vertical, weight, pattern]) => ({
    kind: RULE_KINDS.KEYWORD,
    vertical,
    pattern,
    weight,
  })),
  ...EXCLUSIONS.map((pattern) => ({
    kind: RULE_KINDS.EXCLUSION,
    pattern,
    weight: EXCLUSION_WEIGHT,
  })),
  ...BUYER_PATTERNS.map(([buyerType, pattern]) => ({
    kind: RULE_KINDS.BUYER_PATTERN,
    buyerType,
    pattern,
    weight: 0,
  })),
  { kind: RULE_KINDS.INCUMBENT_SIGNAL, pattern: INCUMBENT_SIGNALS, weight: 0 },
];
