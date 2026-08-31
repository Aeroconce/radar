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
    "activos? fijos?|gestion de activos|control de inventario|bienes de uso",
  ],
  [
    "QUALITY_ACCREDITATION",
    6,
    "seguridad del paciente|eventos adversos|autorizacion sanitaria|gestion de calidad",
  ],
  [
    "DOCUMENT_MGMT",
    5,
    "gestion documental|archivo digital|digitalizacion|documentos electronicos|gestor documental",
  ],
  /*
   * Temas, no sistemas (D-29).
   *
   * `acreditacion`, `inventario`, `expediente` y `oficina de partes` nombran de
   * que trata algo, no que sea software. Con peso 6 entraban solos y traian al
   * tablero el arriendo de una embarcacion, una acreditacion de saberes
   * linguisticos y la reestructuracion de una oficina.
   *
   * Con peso 2 quedan bajo el umbral por si mismos y solo entran acompanados de
   * una palabra que si diga sistema: "sistema de acreditacion" suma 2 + 2 y
   * pasa; "acreditacion de saberes linguisticos" se queda en 2.
   *
   * Es lo que docs/04 ya decia y el motor no cumplia: las verticales describen
   * de que trata el sistema, no reemplazan la exigencia de que sea un sistema.
   *
   * Van antes de la regla generica de peso 2 a proposito: con el mismo peso
   * gana la primera, y asi la vertical que se asigna es la especifica.
   */
  ["QUALITY_ACCREDITATION", 2, "acreditacion"],
  ["FIXED_ASSETS", 2, "inventario"],
  ["DOCUMENT_MGMT", 2, "expediente|oficina de partes"],
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
  "impresor|computador|notebook|equipamiento computacional|equipos? tecnologic|equipos? medic|switch|\\bups\\b|hardware|camara|cctv|telefonia|internet|enlace|fibra",
  "licencias? .*(microsoft|office|adobe|windows|antivirus|autocad|autodesk|archicad|arcgis|matlab|sap|oracle|vmware|fortinet|veeam)|renovacion .*licencias|suscripcion .*(software|licencias)",
  /*
   * `examenes de laboratorio` y `extrasistema`: comprar prestaciones medicas a
   * terceros no es software, pero su texto habla de calidad y acreditacion y
   * sumaba puntos por el tema (D-30).
   */
  "toner|insumos|reactivos|equipos de laboratorio|banco de sangre|examenes de laboratorio|extrasistema|prestaciones medicas",
  "\\bcurso|capacitacion en|diplomado|taller|asesoria|consultoria|levantamiento|inventario (fisico|de bienes)|regularizacion del activo|actualizacion activo fijo|monitoreo ambiental|digitalizacion masiva|servicio de digitalizacion|impresion|imprenta|senaletica|diseno grafico",
  "sistema de (riego|alarma|climatizaci|aire|iluminaci|extinci|calefacci|audio|sonido|bombeo|seguridad electr|control de acceso|deteccion|vigilancia)|sistema electrico|sistema fotovoltaico",
  "remuneraciones|gdp|forense|erp municipal|software integral .*municipal",
  /*
   * Ciberseguridad, que D-18 dejo fuera del alcance y no tenia exclusion. Sin
   * ella entraban un WAF y un SIEM por la palabra `saas`: se contratan como
   * servicio, pero no son desarrollo ni arriendo de un sistema nuestro.
   */
  "ciberseguridad|ethical hacking|hacking etico|pentest|\\bwaf\\b|\\bsiem\\b|firewall|antimalware",
  /*
   * Concesiones: la contraparte opera un negocio, no entrega software. "Sistema
   * de control de estacionamientos en las vias publicas" es una concesion de
   * estacionamientos, y matcheaba `sistema de control`.
   */
  "\\bconcesion",
  /*
   * Comprar licencias no es desarrollo ni arriendo de un sistema: es reventa
   * (D-30). La regla de las marcas solo cubria licencias de productos
   * conocidos; esta cubre el caso generico: "adquisicion de licencias de
   * software", "provision de licencias", "compra de uso de".
   *
   * A proposito NO se excluye `licenciamiento` a secas ni `licencia` sola: el
   * "SISTEMA DE GESTION DOCUMENTAL... saas con licenciamiento ilimitado" es
   * arriendo del bueno, y "licencias de conducir" aparece en sistemas de toma
   * de horas que si son plataformas.
   */
  "licencias? de software|adquisicion de licencias?|provision de licencias?|compra de licencias?|venta de licencias?|suministro de licencias?|compra de uso de",
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
