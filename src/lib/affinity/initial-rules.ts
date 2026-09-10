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
  /*
   * DOCUMENT_MGMT va primero y pesa 6 desde D-43. Con 5 perdia contra una
   * palabra suelta de otra vertical, y con 6 pero detras de APPOINTMENTS
   * seguia perdiendo el empate: la "GESTION DOCUMENTAL Y DIGITAL" de Tiltil
   * nombra un modulo de agendamiento entre cinco, y entre pesos iguales gana
   * la primera. Un gestor documental con agenda es gestor documental.
   */
  [
    "DOCUMENT_MGMT",
    6,
    "gestion documental|archivo digital|digitalizacion|documentos electronicos|gestor documental",
  ],
  /*
   * D-43. `recordatorio`, `whatsapp`, `chatbot` e `inasistencia` con peso 6
   * asignaban APPOINTMENTS a cualquier cosa que los mencionara de paso: la
   * "GESTION DOCUMENTAL Y DIGITAL" de Tiltil (un modulo de recordatorios entre
   * cinco) y los "SERVICIOS PROFESIONALES PERSONAL APOYO INFORMATICA" de Puerto
   * Montt quedaron como citas. Misma leccion que D-29 y D-35: son tema, no
   * sistema. Con 6 solo lo que nombra el sistema de citas; el resto pesa 2 y
   * entra acompanado (mas abajo, con los otros temas).
   */
  [
    "APPOINTMENTS",
    6,
    "agendamiento|confirmacion de (citas|horas)|recordatorio de (citas|horas|atencion)|reserva de horas|contactabilidad",
  ],
  /*
   * D-37. Cuatro de las seis licitaciones reales de septiembre de 2026 (Alto
   * Hospicio, San Bernardo, Ancud y la ofertada del Sotero del Rio) caian en
   * WEB_DEVELOPMENT porque su vertical no existia. La vertical es el eje del
   * tablero: sin estas no se puede filtrar "mantenimiento" y ver los dos CMMS.
   *
   * Van antes de WEB_DEVELOPMENT: con peso 6 ganan a la generica de 5, y entre
   * pesos iguales gana la primera.
   */
  // `mantenimiento (preventivo|correctivo)` salio de aqui y pesa 2 mas abajo (D-47):
  // cualquier contrato de aparatos incluye "mantenimiento preventivo" de paso, y con
  // 6 los sensores de temperatura de Arica quedaban como CMMS con 12 puntos.
  [
    "MAINTENANCE",
    6,
    "gestion de mantenimiento|ordenes? de trabajo|\\bcmms\\b|componentes (de|vinculados a) mantenimiento|plan de mantencion",
  ],
  // `biometri` puede coincidir con la compra de relojes biometricos (hardware).
  // La exclusion de hardware ya resta 6 por `equipos? tecnologic`, y las senales
  // estructurales restan por items de categoria de equipos: la compra de
  // aparatos queda bajo el umbral igual.
  [
    "ATTENDANCE",
    6,
    "control de asistencia|asistencia del personal|reloj control|marcaje|marcacion|biometri",
  ],
  [
    "PHARMA_LOGISTICS",
    6,
    "drogueria|bodega de farmacia|abastecimiento farmaceutico|logistica de medicamentos",
  ],
  /*
   * D-35. "activos? fijos?" con peso 6 traia solo al tablero el seguro contra
   * incendio "para bienes de uso de activo fijo", la "implementacion deportiva y
   * activos fijos no financieros" y el ITAM de JUNAEB por "gestion de activos TI".
   * Misma leccion que D-29: es un tema, no un sistema. Con 6 solo si va pegado a
   * una palabra de sistema; solo, pesa 2 y entra acompanado (mas abajo).
   */
  [
    "FIXED_ASSETS",
    6,
    "(software|sistema|plataforma|gestion|control) de activos? fijos?|activos? fijos? (institucional|municipal)|control de inventario|bienes de uso",
  ],
  [
    "QUALITY_ACCREDITATION",
    6,
    "seguridad del paciente|eventos adversos|autorizacion sanitaria|gestion de calidad",
  ],
  /*
   * Temas, no sistemas (D-29, D-35, D-43 y D-47).
   *
   * `acreditacion`, `inventario`, `activo fijo`, `expediente`, `oficina de
   * partes`, `recordatorio`, `whatsapp`, `chatbot`, `inasistencia` y
   * `mantenimiento preventivo` nombran de que trata algo, no que sea software. Con peso 6 entraban
   * solos y traian al tablero el arriendo de una embarcacion, una acreditacion
   * de saberes linguisticos, la reestructuracion de una oficina y un seguro
   * contra incendio.
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
  ["APPOINTMENTS", 2, "recordatorio|whatsapp|chatbot|inasistencia"],
  ["MAINTENANCE", 2, "mantenimiento (preventivo|correctivo)"],
  ["QUALITY_ACCREDITATION", 2, "acreditacion"],
  ["FIXED_ASSETS", 2, "inventario"],
  ["FIXED_ASSETS", 2, "activos? fijos?|gestion de activos"],
  ["DOCUMENT_MGMT", 2, "expediente|oficina de partes"],
  [
    "WEB_DEVELOPMENT",
    5,
    "desarrollo (de )?(la |el |un |una )?(sistema|software|plataforma|aplicaci|sitio|portal|web)|sistema informatico|plataforma (web|digital|informatica|tecnol)|aplicacion (web|movil)|app movil|sitio web|pagina web|portal web|sistema de gestion|sistemas? de informacion|sistema de (registro|control|seguimiento)|plataforma para|solucion informatica",
  ],
  /*
   * D-38. El listado corta el nombre a 50 caracteres y los compradores
   * abrevian. "SERV. PLAT. INFORMATICA DE REG. CONTROL Y SEGUI." (la ofertada
   * del Sotero del Rio) puntuaba 2 y entraba solo por la puerta de ficha en
   * umbral-1. Con umbral 4 habria quedado fuera sin pedir nunca la descripcion.
   *
   * `plat` y `sist` tras `serv` llevan limite de palabra: son abreviaturas, no
   * prefijos. Sin el limite, "SERV DE PLATAFORMA SIEM" sumaba 5 por "serv de
   * plat" y volvia a entrar pese a la exclusion de ciberseguridad (lo detecto
   * `tests/baseline.test.ts`).
   */
  [
    "WEB_DEVELOPMENT",
    5,
    "plat\\.? ?(inform|tecnol|web|digital)|sist\\.? ?(de )?(reg|control|seg|gest)|serv\\.? ?(de )?(software|plat\\b|sist\\b)|\\bsw\\b (de|para)",
  ],
  /*
   * Terminos agregados el 31-08-2026 tras auditar las 4.721 activas del dia
   * (D-31). Cada uno viene de un falso negativo real:
   *
   * - "desarrollo de LA plataforma": el patron no admitia articulos, y el
   *   DESARROLLO DE LA PLATAFORMA MODULAR DE COMPRAS de ChileCompra (LR)
   *   puntuaba 0.
   * - "arriendo de sistema": la regla cubria arriendo de software, no de
   *   sistema. El alcance del radar se llama "arriendo de sistemas".
   * - "suscripcion de sistema/plataforma": es arriendo con otro nombre.
   * - "contratacion de software": CONTRATACION DE SOFTWARE CONTROL DE OBRAS
   *   puntuaba 2 porque `software (de|para)` exige la preposicion.
   * - "mejora evolutiva" y compania: jerga inequivoca de mantencion de
   *   software a medida.
   * - "migracion de datos": trabajo de desarrollo, y ademas senal de
   *   incumbente que ya se marcaba pero no puntuaba.
   */
  [
    "WEB_DEVELOPMENT",
    4,
    "saas|arriendo (de )?software|arriendo (de )?(un |una |el |la )?(sistema|plataforma)|suscripcion (anual )?(de |a )?(un |una |la )?(sistema|plataforma)|contratacion (de )?software|licenciamiento de sistema|software (de|para|cloud|en)|implementacion (de )?software|servicio de software|mejora evolutiva|mantenimiento evolutivo|soporte evolutivo|migracion de (base de )?datos|solucion tecnol",
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
  ["OTHER", 2, "informatic[oa]|digital|tecnologic|software|web|aplicacion|sistema|plataforma"],
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

  /*
   * D-36. Nueve de catorce descartes de la muestra de septiembre de 2026 eran
   * de cinco naturalezas sin ninguna exclusion: sistemas clinicos, suministro
   * de personal, publicidad, seguros y plataforma integral. Cada una es una
   * linea. Las exclusiones anteriores cubrian el objeto fisico (impresoras,
   * licencias de marca, cursos, riego), no la naturaleza del contrato.
   */

  // Sistemas clinicos: RCE, LIS, RIS/PACS, HIS. Territorio de RAYEN y de
  // proveedores con certificacion clinica; nunca del rubro. `laboratorio
  // clinico` se agrega porque `equipos de laboratorio` y `examenes de
  // laboratorio` no lo cubrian.
  "registro clinico|ficha clinica|\\brce\\b|\\blis\\b|\\bpacs\\b|\\bhis\\b|laboratorio clinico|anatomia patologica",

  // Suministro de personal: turnos de desarrolladores en el hospital, no
  // software. `servicio de turnos (de|para)` y no `sistema de turnos`, que
  // aparece en control de asistencia y si es del rubro.
  "turnos profesionales|suministro de personal|provision de profesionales|servicio de turnos (de|para)",

  // Agencias de medios: "difusion de la plataforma web" puntuaba 7 por hablar
  // de la plataforma que iba a publicitar. Se exige contexto de campana para no
  // botar un modulo de difusion dentro de un sistema. `(planificacion|
  // produccion|implementacion) en medios` se agrego al aplicar la regla: era
  // la unica frase de campana que traia el caso real de Chile Cultura.
  "difusion (en medios|de la campana|publicitaria)|(planificacion|produccion|implementacion) en medios|campana (publicitaria|comunicacional|de difusion)|publicidad|avisaje|medios de comunicacion",

  // Seguros: poliza de incendio "para bienes de uso de activo fijo". Se exige
  // la preposicion para no tocar "acceso seguro" ni "plataforma segura".
  "seguros? (contra|de|anual|general)|poliza de seguro|siniestr|compania de seguros",

  // Plataforma integral: `software integral .*municipal` no atrapaba
  // "plataforma integral para gestion municipal" (Estacion Central, 30
  // sistemas en produccion).
  "plataforma integral|sistema integral de gestion|\\berp\\b",

  // Producto comercial por categoria: la regla de licencias exigia la palabra
  // "licencias" mas una marca; "software de diseno CAD" pasaba sin ninguna.
  "software de diseno|\\bcad\\b|\\bbim\\b|revision de modelos|\\bitam\\b|\\bsam\\b",

  /*
   * D-44. Dos naturalezas que a D-36 se le escaparon, vistas el primer dia de
   * barrido con las reglas de septiembre (11-09-2026).
   */

  // Suministro de personal con otra redaccion: "SERVICIOS PROFESIONALES PERSONAL
  // APOYO INFORMATICA" de Puerto Montt son seis ingenieros por horas, no un
  // sistema. D-36 solo cubria "turnos profesionales" y "suministro de personal".
  "servicios profesionales (de )?(personal|apoyo)|personal de apoyo|apoyo informatico|horas hombre|\\bhh\\b",

  // Infraestructura y monitoreo: la familia que D-18 dejo fuera del alcance,
  // igual que la ciberseguridad. Observabilidad multicloud (FONASA), "servicio
  // tecnologico integral" de una red regional (Subtrans) y la administracion de
  // infraestructura (FOSIS) se contratan como servicio, pero no son desarrollo
  // ni arriendo de un sistema nuestro.
  "observabilidad|multicloud|monitoreo de (infraestructura|red|servidores)|\\bapm\\b|administracion de infraestructura|servicio tecnologico integral",
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
  "continuar|continuidad|actualmente (en uso|utilizado)|sistema actual|migracion|renovacion|renovar|proveedor actual" +
  /*
   * D-39. Nombres propios de proveedores instalados que aparecieron en bases o
   * descripciones de septiembre de 2026. Ver el nombre del competidor en la
   * ficha vale mas que una senal generica.
   */
  "|cas chile|rayen|geovictoria|zecovery|ceropapel|e-?delphyn|softland|smc|sistemas modulares" +
  // Bases escritas alrededor de un sistema en produccion.
  "|en caso de (seguir|cambiar) (con el |de )?(mismo |actual )?proveedor|sistemas? (actualmente )?en (uso|produccion)|no podra disminuir las capacidades";

/*
 * D-40. Dos condiciones cambian la cancha: un relanzamiento (el primer llamado
 * quedo desierto: Alto Hospicio y Coyhaique en septiembre de 2026) y la
 * reserva para empresas de menor tamano (art. 182 del reglamento: deja fuera a
 * los grandes). Se muestran como etiqueta, igual que las de incumbente, para
 * que quien revise las vea. No suman puntaje por regla; las senales
 * estructurales de docs/15 si las consideran.
 */
const OPPORTUNITY_SIGNALS =
  "segundo llamado|2do llamado|tercer llamado|deja sin efecto.*(decreto|resolucion)|declarada desierta" +
  "|empresas? de menor tamano|\\bemt\\b|articulo 182";

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
  { kind: RULE_KINDS.OPPORTUNITY_SIGNAL, pattern: OPPORTUNITY_SIGNALS, weight: 0 },
];
