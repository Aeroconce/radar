/**
 * Las 20 licitaciones revisadas a mano entre el 3 y el 10 de septiembre de 2026
 * (docs/19), base empirica de las decisiones D-35 a D-41, mas las 8 del 11 de
 * septiembre, primer dia de barrido con esas reglas (D-43 a D-47). `muestra`
 * distingue las dos: las del 3 son el contrato del texto solo
 * (`affinity.test.ts`); las del 11 caen solo con la ficha y se prueban con el
 * puntaje completo (`structural.test.ts`).
 *
 * Nombres y descripciones tal como los devolvio la API esos dias. Monto en
 * pesos; duracion en meses (`null` = compra unica o sin dato). `item` es la
 * primera categoria del listado de items, suficiente para la senal
 * estructural de docs/15.
 *
 * `esperado` es el resultado tras aplicar docs/14 y docs/15:
 * - "entra": viable; debe superar el umbral y quedar en su vertical.
 * - "no entra": trampa que el texto y la ficha deben botar.
 * - "entra bajo": solo la revision de docs/16 la descarta; entra, pero debajo
 *   de toda viable y con la etiqueta que explica por que.
 * - "al borde": merece una mirada rapida, no descarte automatico.
 *
 * Mantenimiento: cada licitacion revisada a mano cuyo resultado sorprenda al
 * radar se agrega aqui con su resultado esperado ANTES de tocar una regla.
 */
export type Esperado = "entra" | "no entra" | "entra bajo" | "al borde";

export interface Caso {
  code: string;
  /** Fecha de la muestra a la que pertenece. */
  muestra: "2026-09-03" | "2026-09-11";
  esperado: Esperado;
  /** Solo en las viables: la vertical que debe asignarse. */
  vertical?: string;
  /** La vertical que NO debe asignarse: una clasificacion equivocada que se corrigio. */
  verticalNo?: string;
  /** Etiqueta estructural que debe aparecer (docs/15). */
  tagEsperada?: string;
  name: string;
  description: string;
  processType: string;
  amount: number | null;
  /** Duracion en meses, como la escribio la revision a mano. */
  months: number | null;
  /** Duracion tal como la guarda `Tender`, cuando se construyo desde la ficha. Manda sobre `months`. */
  durationValue?: number | null;
  durationUnit?: string | null;
  /** La primera categoria de items. */
  item: string;
  /** Todas las categorias, cuando se construyo desde la ficha. Mandan sobre `item`. */
  items?: string[];
}

export const CASOS: Caso[] = [
  // ============================ muestra del 3 al 10 de septiembre ============================

  // ---- viables ----
  {
    code: "1305541-3-LE26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "FIXED_ASSETS",
    name: "ARRIENDO DE SOFTWARE DE INVENTARIO",
    description:
      "software integral para administrar, controlar y monitorear existencias de bodega y activo fijo institucional",
    processType: "LE",
    amount: 42_000_000,
    months: 36,
    item: "Tecnologías de la información / Software / Programas de gestión de inventario",
  },
  {
    code: "2494-81-LP26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "DOCUMENT_MGMT",
    name: "GESTOR DOCUMENTAL",
    description: "plataforma para crear, almacenar, organizar y buscar archivos electrónicos",
    processType: "LP",
    amount: 81_000_000,
    months: 36,
    item: "Tecnologías de la información / Software / Software de gestión documental",
  },
  {
    code: "1274285-45-LP26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "PHARMA_LOGISTICS",
    name: "Software de gestión Droguería Comunal",
    description:
      "control de procesos de bodega y gestión de droguería: recepción, almacenamiento, despacho, inventario y reportes",
    processType: "LP",
    amount: 90_000_000,
    months: 36,
    item: "Tecnologías de la información / Software / Software de cadena de suministro y logística",
  },
  {
    code: "3447-142-LE26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "ATTENDANCE",
    name: "Adquisición de Sistema de Control de Asistencia",
    description:
      "arriendo de una solución integral de gestión y control de asistencia para la red de atención primaria de salud",
    processType: "LE",
    amount: 69_500_000,
    months: 24,
    item: "Tecnologías de la información / Software / Software de gestión",
  },
  {
    code: "2048-57-LP26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "MAINTENANCE",
    name: "Convenio de Software de Gestión de Mantenimiento",
    description: "software de gestión de mantenimiento para el Hospital de Ancud",
    processType: "LP",
    amount: 142_500_000,
    months: 60,
    item: "Tecnologías de la información / Software / Software de gestión",
  },
  {
    code: "1057501-431-LE26",
    muestra: "2026-09-03",
    esperado: "entra",
    vertical: "MAINTENANCE",
    name: "SERV. PLAT. INFORMÁTICA DE REG. CONTROL Y SEGUI.",
    description:
      "provisión e implementación de un Sistema de Registro, Control y Seguimiento de Componentes Vinculados a Mantenimiento",
    processType: "LE",
    amount: null,
    months: 24,
    item: "Servicios informáticos / Ingeniería en computación e informática",
  },

  // ---- trampas que el texto y la ficha deben botar ----
  {
    code: "1725-196-LE26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "DIFUSIÓN PLATAFORMA WEB APLICACIÓN MÓVIL CHILE CUL",
    description:
      "servicio de planificación, producción e implementación en medios para difusión de la plataforma web y aplicación móvil Chile Cultura",
    processType: "LE",
    amount: 50_000_000,
    months: 2,
    item: "Publicidad / Publicidad en radio",
  },
  {
    code: "1057049-332-LR26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "SERVICIO DE TURNOS PROFESIONALES PARA DESARROLLO DE SOFTWARE INTERNO DEL HOSPITAL CLÍNICO SAN BORJA ARRIARÁN",
    description: "contratación de turnos profesionales para desarrollo de software interno",
    processType: "LR",
    amount: 819_072_000,
    months: 24,
    item: "Servicios informáticos",
  },
  {
    code: "2099-48-L126",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "Adquisición de un seguro anual contra incendio para bienes de uso de activo fijo",
    description: "seguro contra incendio para bienes de uso de activo fijo de la SEREMI",
    processType: "L1",
    amount: 4_500_000,
    months: 12,
    item: "Seguros / Seguros de edificios o de su contenido",
  },
  {
    code: "932-26-LE26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "ADQUISICION DE IMPLEMENTACIÓN DEPORTIVA Y ACTIVOS FIJOS NO FINANCIEROS PROGRAMA FORTALECIMIENTO",
    description: "implementación deportiva y activos fijos no financieros",
    processType: "LE",
    amount: 24_117_118,
    months: null,
    item: "Equipos, suministros y accesorios deportivos",
  },
  {
    code: "1057494-50-LR26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "Arriendo de software para la gestión de la Unidad de Laboratorio Clínico",
    description: "arriendo de software unidad de laboratorio clínico",
    processType: "LR",
    amount: 600_000_000,
    months: 60,
    item: "Tecnologías de la información / Software",
  },
  {
    code: "2200-23-LR26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "ARRIENDO DE SOFTWARE DE REGISTRO CLÍNICO ELECTRÓNICO (RCE) ATENCIÓN PRIMARIA",
    description:
      "arriendo de software RCE para la red de atención primaria, configuración, instalación, mantención, soporte y data center",
    processType: "LR",
    amount: null,
    months: 18,
    item: "Tecnologías de la información / Software",
  },
  {
    code: "3810-23-LE26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "ADQUISICION DE SOFTWARE DE DISEÑO CAD Y REVISION DE MODELOS BIM PARA LA DIRECCION DE OBRAS MUNICIPALES",
    description: "adquisición de software de diseño CAD y revisión de modelos BIM",
    processType: "LE",
    amount: 18_000_000,
    months: null,
    item: "Tecnologías de la información / Software / Software de gestión de licencias",
  },
  {
    code: "434-104-LE26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "SERVIDOR DE DATOS SEGUN FORMULARIO N°14 INFORMATICA",
    description: "adquisición de servidor de datos",
    processType: "LE",
    amount: 20_000_000,
    months: null,
    item: "Equipos informáticos y accesorios / Computadores / Servidores",
  },
  {
    code: "2434-20-LP26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "Servicio de plataforma integral para gestión municipal",
    description:
      "suministro y mantención de sistemas informáticos, continuidad operacional, seguridad de la información, interoperabilidad entre sistemas",
    processType: "LP",
    amount: 204_000_000,
    months: 12,
    item: "Tecnologías de la información / Software / Software de interconectividad de plataformas",
  },
  {
    code: "85-41-LE26",
    muestra: "2026-09-03",
    esperado: "no entra",
    name: "Plataforma integral de soporte TI con control remoto",
    description:
      "solución centralizada de gestión de activos TI (ITAM) y administración de licenciamiento de software (SAM), suscripción plurianual",
    processType: "LE",
    amount: 22_000_000,
    months: 36,
    item: "Tecnologías de la información / Software",
  },
  {
    code: "1973-93-LR26",
    muestra: "2026-09-03",
    esperado: "al borde",
    name: "SISTEMA DE INFORMACIÓN DE GESTIÓN ADMINISTRATIVA Y FARMACIA",
    description: "sistema de información de gestión administrativa y farmacia, arriendo por 60 meses",
    processType: "LR",
    amount: 414_000_000,
    months: 60,
    item: "Tecnologías de la información / Software",
  },

  // ---- trampas que solo la revision (docs/16) descarta: entran, pero debajo de las viables ----
  {
    code: "5586-128-LE26",
    muestra: "2026-09-03",
    esperado: "entra bajo",
    tagEsperada: "sin descripcion util",
    name: "Contratación de plataforma tecnológica tipo SaaS de gestión digital",
    description: "DE ACUERDO A REQUERIMIENTO ADJUNTO",
    processType: "LE",
    amount: 13_000_000,
    months: 18,
    item: "Tecnologías de la información / Software",
  },
  {
    code: "3902-39-LP26",
    muestra: "2026-09-03",
    esperado: "entra bajo",
    tagEsperada: "canon 7.6M",
    name: "SERVICIO SOFTWARE SISTEMAS DE INFORMACIÓN BULNES.",
    description:
      "servicio de software de sistemas de información municipal y departamento de salud, migración desde sistemas actuales",
    processType: "LP",
    amount: 182_400_000,
    months: 24,
    item: "Tecnologías de la información / Software",
  },
  {
    code: "85-34-LP26",
    muestra: "2026-09-03",
    esperado: "entra bajo",
    tagEsperada: "reservada EMT",
    name: "PLATAFORMA GESTIÓN Y CONTROL SEGURIDAD INFORMACIÓN",
    description:
      "plataforma tecnológica para gestión y control de la seguridad de la información y continuidad operativa, reservada a empresas de menor tamaño",
    processType: "LP",
    amount: 100_000_000,
    months: 13,
    item: "Tecnologías de la información / Software",
  },

  // ============ primer dia de barrido con las reglas de septiembre (11-09-2026) ============
  // Construidos desde `Tender` con los campos de la ficha: nombre, descripcion,
  // tipo, monto, duracion e items tal como los devolvio la API. Los que no
  // entran caen solo con la ficha, no con el texto.
  // Tiltil: gestor documental con un modulo de agendamiento entre cinco; quedaba como APPOINTMENTS (D-43)
  {
    code: "3666-12-LE26",
    muestra: "2026-09-11",
    esperado: "entra",
    vertical: "DOCUMENT_MGMT",
    name: "GESTION DOCUMENTAL Y DIGITAL MUNICIPALIDAD TILTIL",
    description:
      "La presente Licitación tiene por objeto la contratación de una solución que comprenda al menos cinco 5 módulos funcionales interoperables: gestión de expedientes electrónicos, solicitudes ciudadanas, firma electrónica, agendamiento ciudadano y analítica de datos, todo bajo infraestructura de alta disponibilidad y cumplimiento normativo vigente.",
    processType: "LE",
    amount: 58000000,
    months: null,
    durationValue: 24,
    durationUnit: "meses",
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión de contenidos",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión de contenidos"],
  },
  // Lota: carrera funcionaria, software de gestion sin monto publicado
  {
    code: "3019-20-LE26",
    muestra: "2026-09-11",
    esperado: "entra",
    name: "SOFTWARE CARRERA FUNCIONARIA APS LOTA",
    description:
      "SE REQUIERE ADQUISICIÓN DE SOFTWARE DE GESTIÓN DE CARRERA FUNCIONARIA PARA LOS FUNCIONARIOS, PERMITIRÁ ADMINISTRAR DE MANERA EFICIENTE, TRANSPARENTE Y CENTRALIZADA LOS PROCESOS ASOCIADOS A LA CARRERA FUNCIONARIA DEL PERSONAL DE ATENCIÓN PRIMARIA DE SALUD CONFORME A LA LEY N 19.378. POR UN PERIODO DE 24 MESES.",
    processType: "LE",
    amount: null,
    months: null,
    durationValue: null,
    durationUnit: null,
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión"],
  },
  // Maria Pinto: gestor documental en arriendo a 36 meses
  {
    code: "4099-25-LE26",
    muestra: "2026-09-11",
    esperado: "entra",
    vertical: "DOCUMENT_MGMT",
    name: "Servicio de Arriendo de Gestor Documental",
    description:
      "CONVENIO DE SUMINISTRO DE ARRIENDO GESTOR DOCUMENTAL PARA LA MUNICIPALIDAD DE MARÍA PINTO",
    processType: "LE",
    amount: null,
    months: null,
    durationValue: 36,
    durationUnit: "meses",
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión de contenidos",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión de contenidos"],
  },
  // COMUDEF: plataforma de control de proyectos
  {
    code: "188-83-LP26",
    muestra: "2026-09-11",
    esperado: "entra",
    name: "Plataforma de Control de Proyectos COMUDEF",
    description:
      "La Corporación Municipal de La Florida, en adelante también llamado “COMUDEF” o “La Corporación”, ha elaborado las presentes Bases Administrativas, Bases Técnicas y Anexos de Licitación Pública, las cuales contienen todas las condiciones y especificaciones técnicas que deberán cumplir los oferentes para materializar la “CONTRATACIÓN, IMPLEMENTACIÓN Y SOPORTE DE PLATAFORMA DIGITAL DE SISTEMA DE  SEGUIMIENTO Y CONTROL DE PROYECTOS, SERVICIOS Y HONORARIOS CORPORATIVOS PARA LA CORPORACIÓN MUNICIPAL DE LA FLORIDA – COMUDEF”, por un periodo de doce 12 meses.",
    processType: "LP",
    amount: null,
    months: null,
    durationValue: 12,
    durationUnit: "meses",
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de controladores de dispositivos y utilidades",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de controladores de dispositivos y utilidades"],
  },
  // Subtrans: servicio tecnologico integral de una red regional, infraestructura (D-44, D-45)
  {
    code: "577290-2-LP26",
    muestra: "2026-09-11",
    esperado: "no entra",
    name: "SERVICIO TECNOLÓGICO INTEGRAL RED REGIONAL",
    description:
      "La Subsecretaría de Transportes tiene como uno de sus objetivos prioritarios el contar con un sistema de transporte público regional eficiente, seguro y de calidad que se extienda a lo largo de todas las regiones de nuestro país. A fin de dar cumplimiento a dicho objetivo, se realiza el llamado a licitación para contratar un servicio tecnológico integral que permita implementar, operar y mantener una aplicación móvil y sus sistemas asociados, destinada a entregar información en tiempo real, precisa y accesible a las personas usuarias del sistema de transporte público regional en adelante, “sistema tecnológico integral”. Esta solución debe contribuir a mejorar la experiencia de viaje, fortalecer la infraestructura tecnológica del sistema y asegurar la continuidad, calidad y escalabilidad del servicio en múltiples ciudades del país. Las presentes bases técnicas contienen los requerimientos funcionales y técnicos mínimos a ser incluidos en el sistema tecnológico integral. Este proceso comprende todo lo relacionado con el diseño, desarrollo, integración, suministro, montaje, configuración, pruebas de homologación, puesta en marcha, administración, operación y mantenimiento de esta solución.",
    processType: "LP",
    amount: null,
    months: null,
    durationValue: 28,
    durationUnit: "meses",
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de aplicaciones de red",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de aplicaciones de red"],
  },
  // Arica: sensores de temperatura para refrigeradores, con mantenimiento preventivo de paso (D-45, D-47)
  {
    code: "1075963-403-L126",
    muestra: "2026-09-11",
    esperado: "no entra",
    tagEsperada: "sin item de software",
    name: "ARRIENDO SISTEMA MONITOREO EN LINEA PARA REFRIGERADORES DE FARMACOS ONCOLOGICOS",
    description:
      "SERVICIO DE ARRIENDO MENSUA PARA SISTEMA DE MONITOREO EN LINEA PARA 2 REFRIGERADORES DE FÁRMACOS ONNCOLOGICOS UBICADOS EN BODEGA DE FÁRMACOS Y AREA DE ACCESOS. \n\nDEBE INCLUIR:\n- 2 Sensores de Humedad/ Temperatura Alta, AA battery\n- 1 Gateway Alta IoT Ethernet \n- Capacitación administrado\n- Puesta en marcha Sistema de Monitoreo\n- Instalación sensores y Gateway \n- Mantenimiento preventivo y correctivo incluido durante periodo de arriendo",
    processType: "L1",
    amount: 4000000,
    months: null,
    durationValue: null,
    durationUnit: null,
    item: "Equipamiento para laboratorios / Instrumentos de medida y experimentación / Instrumentos de medición eléctrica",
    items: ["Equipamiento para laboratorios / Instrumentos de medida y experimentación / Instrumentos de medición eléctrica"],
  },
  // FONASA: observabilidad multicloud, infraestructura y monitoreo (D-44)
  {
    code: "591-26-LP26",
    muestra: "2026-09-11",
    esperado: "no entra",
    name: "PLATAFORMA DE OBSERVABILIDAD AVANZADA MULTICLOUD PARA FONASA.",
    description:
      "El Oferente para la provisión de una plataforma de observabilidad SaaS y la prestación de servicios profesionales especializados para su configuración, despliegue multicloud y transferencia tecnológica",
    processType: "LP",
    amount: null,
    months: null,
    durationValue: 15,
    durationUnit: "meses",
    item: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión",
    items: ["Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión"],
  },
  // Puerto Montt: seis ingenieros por horas, staffing con otra redaccion; quedaba como APPOINTMENTS (D-43, D-44)
  {
    code: "1057539-138-LP26",
    muestra: "2026-09-11",
    esperado: "no entra",
    verticalNo: "APPOINTMENTS",
    name: "SERVICIOS PROFESIONALES PERSONAL APOYO INFORMATICA",
    description:
      "La presente licitación tiene por objeto la contratación de los servicios profesionales de 6 ingenieros o especialistas en informática para el Hospital de Puerto Montt. La necesidad de esta contratación se fundamenta en el sostenido incremento de la digitalización de los procesos clínicos y administrativos del establecimiento tales como la ficha clínica electrónica, agendamiento y plataformas logísticas. Esta creciente digitalización hace indispensable contar con un equipo técnico especializado que garantice la disponibilidad ininterrumpida de la infraestructura tecnológica, evitando quiebres en los sistemas que puedan comprometer la oportunidad, calidad y seguridad en la atención de salud de los pacientes. \r\n\r\nEn virtud de lo anterior, las prestaciones que se pretende satisfacer mediante este proceso licitatorio consisten en externalizar el apoyo operativo especializado, destinando a estos profesionales a las áreas críticas de Soporte, Redes y Sistemas. Sus funciones principales abarcarán el aseguramiento de la continuidad operativa de la red de datos institucional, el mantenimiento preventivo y correctivo de hardware y software, la administración y optimización de los sistemas de información hospitalaria, y la entrega de soporte técnico oportuno a las diversas unidades clínicas y administrativas del recinto.",
    processType: "LP",
    amount: 184212000,
    months: null,
    durationValue: 12,
    durationUnit: "meses",
    item: "Servicios profesionales, administrativos y consultorías de gestión empresarial / Servicios de recursos humanos / Contratación de personal",
    items: ["Servicios profesionales, administrativos y consultorías de gestión empresarial / Servicios de recursos humanos / Contratación de personal"],
  },
];
