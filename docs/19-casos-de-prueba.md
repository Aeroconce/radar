# 19 — Casos de prueba

Los 20 casos de septiembre como fixture. `entra` es el resultado esperado tras aplicar docs/14 y docs/15.
Nombres y descripciones tal como los devolvió la API; monto en pesos; duración en meses (`null` = compra
única o sin dato). Los ítems son la primera categoría del listado, suficiente para la señal del docs/15.

```ts
export const CASOS = [
  // ---- viables ----
  { code: "1305541-3-LE26", esperado: "entra", vertical: "FIXED_ASSETS",
    name: "ARRIENDO DE SOFTWARE DE INVENTARIO",
    description: "software integral para administrar, controlar y monitorear existencias de bodega y activo fijo institucional",
    processType: "LE", amount: 42_000_000, months: 36, item: "Tecnologías de la información / Software / Programas de gestión de inventario" },
  { code: "2494-81-LP26", esperado: "entra", vertical: "DOCUMENT_MGMT",
    name: "GESTOR DOCUMENTAL",
    description: "plataforma para crear, almacenar, organizar y buscar archivos electrónicos",
    processType: "LP", amount: 81_000_000, months: 36, item: "Tecnologías de la información / Software / Software de gestión documental" },
  { code: "1274285-45-LP26", esperado: "entra", vertical: "PHARMA_LOGISTICS",
    name: "Software de gestión Droguería Comunal",
    description: "control de procesos de bodega y gestión de droguería: recepción, almacenamiento, despacho, inventario y reportes",
    processType: "LP", amount: 90_000_000, months: 36, item: "Tecnologías de la información / Software / Software de cadena de suministro y logística" },
  { code: "3447-142-LE26", esperado: "entra", vertical: "ATTENDANCE",
    name: "Adquisición de Sistema de Control de Asistencia",
    description: "arriendo de una solución integral de gestión y control de asistencia para la red de atención primaria de salud",
    processType: "LE", amount: 69_500_000, months: 24, item: "Tecnologías de la información / Software / Software de gestión" },
  { code: "2048-57-LP26", esperado: "entra", vertical: "MAINTENANCE",
    name: "Convenio de Software de Gestión de Mantenimiento",
    description: "software de gestión de mantenimiento para el Hospital de Ancud",
    processType: "LP", amount: 142_500_000, months: 60, item: "Tecnologías de la información / Software / Software de gestión" },
  { code: "1057501-431-LE26", esperado: "entra", vertical: "MAINTENANCE",
    name: "SERV. PLAT. INFORMÁTICA DE REG. CONTROL Y SEGUI.",
    description: "provisión e implementación de un Sistema de Registro, Control y Seguimiento de Componentes Vinculados a Mantenimiento",
    processType: "LE", amount: null, months: 24, item: "Servicios informáticos / Ingeniería en computación e informática" },

  // ---- trampas que el texto y la ficha deben botar ----
  { code: "1725-196-LE26", esperado: "no entra",
    name: "DIFUSIÓN PLATAFORMA WEB APLICACIÓN MÓVIL CHILE CUL",
    description: "servicio de planificación, producción e implementación en medios para difusión de la plataforma web y aplicación móvil Chile Cultura",
    processType: "LE", amount: 50_000_000, months: 2, item: "Publicidad / Publicidad en radio" },
  { code: "1057049-332-LR26", esperado: "no entra",
    name: "SERVICIO DE TURNOS PROFESIONALES PARA DESARROLLO DE SOFTWARE INTERNO DEL HOSPITAL CLÍNICO SAN BORJA ARRIARÁN",
    description: "contratación de turnos profesionales para desarrollo de software interno",
    processType: "LR", amount: 819_072_000, months: 24, item: "Servicios informáticos" },
  { code: "2099-48-L126", esperado: "no entra",
    name: "Adquisición de un seguro anual contra incendio para bienes de uso de activo fijo",
    description: "seguro contra incendio para bienes de uso de activo fijo de la SEREMI",
    processType: "L1", amount: 4_500_000, months: 12, item: "Seguros / Seguros de edificios o de su contenido" },
  { code: "932-26-LE26", esperado: "no entra",
    name: "ADQUISICION DE IMPLEMENTACIÓN DEPORTIVA Y ACTIVOS FIJOS NO FINANCIEROS PROGRAMA FORTALECIMIENTO",
    description: "implementación deportiva y activos fijos no financieros",
    processType: "LE", amount: 24_117_118, months: null, item: "Equipos, suministros y accesorios deportivos" },
  { code: "1057494-50-LR26", esperado: "no entra",
    name: "Arriendo de software para la gestión de la Unidad de Laboratorio Clínico",
    description: "arriendo de software unidad de laboratorio clínico",
    processType: "LR", amount: 600_000_000, months: 60, item: "Tecnologías de la información / Software" },
  { code: "2200-23-LR26", esperado: "no entra",
    name: "ARRIENDO DE SOFTWARE DE REGISTRO CLÍNICO ELECTRÓNICO (RCE) ATENCIÓN PRIMARIA",
    description: "arriendo de software RCE para la red de atención primaria, configuración, instalación, mantención, soporte y data center",
    processType: "LR", amount: null, months: 18, item: "Tecnologías de la información / Software" },
  { code: "3810-23-LE26", esperado: "no entra",
    name: "ADQUISICION DE SOFTWARE DE DISEÑO CAD Y REVISION DE MODELOS BIM PARA LA DIRECCION DE OBRAS MUNICIPALES",
    description: "adquisición de software de diseño CAD y revisión de modelos BIM",
    processType: "LE", amount: 18_000_000, months: null, item: "Tecnologías de la información / Software / Software de gestión de licencias" },
  { code: "434-104-LE26", esperado: "no entra",
    name: "SERVIDOR DE DATOS SEGUN FORMULARIO N°14 INFORMATICA",
    description: "adquisición de servidor de datos",
    processType: "LE", amount: 20_000_000, months: null, item: "Equipos informáticos y accesorios / Computadores / Servidores" },
  { code: "2434-20-LP26", esperado: "no entra",
    name: "Servicio de plataforma integral para gestión municipal",
    description: "suministro y mantención de sistemas informáticos, continuidad operacional, seguridad de la información, interoperabilidad entre sistemas",
    processType: "LP", amount: 204_000_000, months: 12, item: "Tecnologías de la información / Software / Software de interconectividad de plataformas" },
  { code: "85-41-LE26", esperado: "no entra",
    name: "Plataforma integral de soporte TI con control remoto",
    description: "solución centralizada de gestión de activos TI (ITAM) y administración de licenciamiento de software (SAM), suscripción plurianual",
    processType: "LE", amount: 22_000_000, months: 36, item: "Tecnologías de la información / Software" },
  { code: "1973-93-LR26", esperado: "al borde",
    name: "SISTEMA DE INFORMACIÓN DE GESTIÓN ADMINISTRATIVA Y FARMACIA",
    description: "sistema de información de gestión administrativa y farmacia, arriendo por 60 meses",
    processType: "LR", amount: 414_000_000, months: 60, item: "Tecnologías de la información / Software" },

  // ---- trampas que solo la revisión (docs/16) descarta: entran, pero debajo de las viables ----
  { code: "5586-128-LE26", esperado: "entra bajo", tagEsperada: "sin descripcion util",
    name: "Contratación de plataforma tecnológica tipo SaaS de gestión digital",
    description: "DE ACUERDO A REQUERIMIENTO ADJUNTO",
    processType: "LE", amount: 13_000_000, months: 18, item: "Tecnologías de la información / Software" },
  { code: "3902-39-LP26", esperado: "entra bajo", tagEsperada: "canon 7.6M",
    name: "SERVICIO SOFTWARE SISTEMAS DE INFORMACIÓN BULNES.",
    description: "servicio de software de sistemas de información municipal y departamento de salud, migración desde sistemas actuales",
    processType: "LP", amount: 182_400_000, months: 24, item: "Tecnologías de la información / Software" },
  { code: "85-34-LP26", esperado: "entra bajo", tagEsperada: "reservada EMT",
    name: "PLATAFORMA GESTIÓN Y CONTROL SEGURIDAD INFORMACIÓN",
    description: "plataforma tecnológica para gestión y control de la seguridad de la información y continuidad operativa, reservada a empresas de menor tamaño",
    processType: "LP", amount: 100_000_000, months: 13, item: "Tecnologías de la información / Software" },
];
```

## Primer día de barrido con las reglas de septiembre (11-09-2026)

Ocho casos más, construidos desde `Tender` con los campos de la ficha (nombre, descripción, tipo, monto, duración e
ítems tal como los devolvió la API), marcados con `muestra: "2026-09-11"` en el fixture. Caen **solo con la ficha**,
no con el texto: por eso se prueban en `tests/structural.test.ts` con el puntaje completo, y no en el bloque de
texto de `affinity.test.ts`. Son la evidencia de D-43 a D-47.

| Código | Nombre | Esperado |
|---|---|---|
| 3666-12-LE26 | GESTION DOCUMENTAL Y DIGITAL MUNICIPALIDAD TILTIL | entra · vertical DOCUMENT_MGMT |
| 3019-20-LE26 | SOFTWARE CARRERA FUNCIONARIA APS LOTA | entra |
| 4099-25-LE26 | Servicio de Arriendo de Gestor Documental | entra · vertical DOCUMENT_MGMT |
| 188-83-LP26 | Plataforma de Control de Proyectos COMUDEF | entra |
| 577290-2-LP26 | SERVICIO TECNOLÓGICO INTEGRAL RED REGIONAL | no entra |
| 1075963-403-L126 | ARRIENDO SISTEMA MONITOREO EN LINEA PARA REFRIGERADORES D… | no entra · etiqueta «sin item de software» |
| 591-26-LP26 | PLATAFORMA DE OBSERVABILIDAD AVANZADA MULTICLOUD PARA FON… | no entra |
| 1057539-138-LP26 | SERVICIOS PROFESIONALES PERSONAL APOYO INFORMATICA | no entra · vertical ≠ APPOINTMENTS |

Además, toda licitación con esperado «entra» debe rankear sobre toda «no entra», en las dos muestras juntas.

## Cómo usarlo

```ts
for (const c of CASOS) {
  const texto = scoreText(`${c.name} ${c.description}`, rules);
  const estructural = computeStructural({ ...c, items: [{ Categoria: c.item }] });
  const total = texto.score + estructural.score;
  if (c.esperado === "entra") expect(total).toBeGreaterThanOrEqual(umbral);
  if (c.esperado === "no entra") expect(total).toBeLessThan(umbral);
  if (c.vertical) expect(classifyVertical(texto, rules)).toBe(c.vertical);
  if (c.tagEsperada) expect(estructural.tags).toContain(c.tagEsperada);
}
// Orden: toda viable debe rankear sobre toda "entra bajo".
```

## Mantenimiento

Cada licitación que se revise a mano y cuyo resultado sorprenda al radar (entró y era trampa, o no entró y
era viable) se agrega aquí con su resultado esperado **antes** de tocar una regla. Así la regla nueva nace
con su prueba, y ninguna corrección rompe lo que ya funcionaba.
