# 14 — Reglas de texto (D-35 a D-40, D-43 y D-44)

Todas en el formato de `src/lib/affinity/initial-rules.ts`: sin tildes, una regla por línea, con el
comentario de justificación que la convención de `docs/04` exige. La semilla (`SEED_AUTHOR`) reemplaza
solo las suyas, así que estas se agregan a `KEYWORDS`, `EXCLUSIONS`, `BUYER_PATTERNS` e `INCUMBENT_SIGNALS`
y entran con `pnpm prisma db seed`; después «Recalcular el tablero» las aplica a lo ya guardado.

## D-35 — "Activo fijo" se divide como se dividió "inventario" (D-29)

Reemplaza la regla `["FIXED_ASSETS", 6, "activos? fijos?|gestion de activos|control de inventario|bienes de uso"]`.

```ts
/*
 * D-35. "activos? fijos?" con peso 6 traia solo al tablero el seguro contra
 * incendio "para bienes de uso de activo fijo", la "implementacion deportiva y
 * activos fijos no financieros" y el ITAM de JUNAEB por "gestion de activos TI".
 * Misma lesion que D-29: es un tema, no un sistema. Con 6 solo si va pegado a
 * una palabra de sistema; solo, pesa 2 y entra acompanado.
 */
[
  "FIXED_ASSETS",
  6,
  "(software|sistema|plataforma|gestion|control) de activos? fijos?|activos? fijos? (institucional|municipal)|control de inventario|bienes de uso",
],
["FIXED_ASSETS", 2, "activos? fijos?|gestion de activos"],
```

## D-36 — Exclusiones por naturaleza del contrato

Se agregan a `EXCLUSIONS` (peso −6 como las demás).

```ts
/*
 * D-36. Nueve de catorce descartes de la muestra de septiembre eran de cinco
 * naturalezas sin ninguna exclusion: sistemas clinicos, suministro de personal,
 * publicidad, seguros y plataforma integral. Cada una es una linea.
 */

// Sistemas clinicos: RCE, LIS, RIS/PACS, HIS. Territorio de RAYEN y de proveedores
// con certificacion clinica; nunca del rubro. `laboratorio clinico` se agrega
// porque `equipos de laboratorio` y `examenes de laboratorio` no lo cubrian.
"registro clinico|ficha clinica|\\brce\\b|\\blis\\b|\\bpacs\\b|\\bhis\\b|laboratorio clinico|anatomia patologica",

// Suministro de personal: turnos de desarrolladores en el hospital, no software.
// `servicio de turnos (de|para)` y no `sistema de turnos`, que aparece en control
// de asistencia y si es del rubro.
"turnos profesionales|suministro de personal|provision de profesionales|servicio de turnos (de|para)",

// Agencias de medios: "difusion de la plataforma web" puntuaba 7 por hablar de
// la plataforma que iba a publicitar. Se exige contexto de campana para no
// botar un modulo de difusion dentro de un sistema.
"difusion (en medios|de la campana|publicitaria)|campana (publicitaria|comunicacional|de difusion)|publicidad|avisaje|medios de comunicacion",

// Seguros: poliza de incendio "para bienes de uso de activo fijo". Se exige la
// preposicion para no tocar "acceso seguro" ni "plataforma segura".
"seguros? (contra|de|anual|general)|poliza de seguro|siniestr|compania de seguros",

// Plataforma integral: `software integral .*municipal` no atrapaba "plataforma
// integral para gestion municipal" (Estacion Central, 30 sistemas en produccion).
"plataforma integral|sistema integral de gestion|\\berp\\b",

// Producto comercial por categoria: la regla de licencias exigia la palabra
// "licencias" mas una marca; "software de diseno CAD" pasaba sin ninguna.
"software de diseno|\\bcad\\b|\\bbim\\b|revision de modelos|\\bitam\\b|\\bsam\\b",
```

## D-37 — Tres verticales nuevas

Requiere agregar valores al enum `Vertical` de `prisma/schema.prisma` y una migración:

```prisma
enum Vertical {
  APPOINTMENTS
  FIXED_ASSETS
  DOCUMENT_MGMT
  QUALITY_ACCREDITATION
  ATTENDANCE        // control de asistencia
  MAINTENANCE       // gestion de mantenimiento (CMMS)
  PHARMA_LOGISTICS  // drogueria y bodega farmaceutica, no clinico
  WEB_DEVELOPMENT
  OTHER
}
```

Van **antes** de `WEB_DEVELOPMENT` en `KEYWORDS`: con peso 6 ganan a la genérica de 5, y entre pesos
iguales gana la primera.

```ts
/*
 * D-37. Cuatro de las seis licitaciones reales de septiembre (Alto Hospicio, San
 * Bernardo, Ancud y la ofertada del Sotero del Rio) caian en WEB_DEVELOPMENT
 * porque su vertical no existia. La vertical es el eje del tablero: sin estas
 * no se puede filtrar "mantenimiento" y ver los dos CMMS.
 */
[
  "MAINTENANCE",
  6,
  "gestion de mantenimiento|mantenimiento (preventivo|correctivo)|ordenes? de trabajo|\\bcmms\\b|componentes (de|vinculados a) mantenimiento|plan de mantencion",
],
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
```

Nota sobre `biometri`: puede coincidir con compra de relojes biométricos (hardware). La exclusión de
hardware ya resta 6 por `equipos? tecnologic`, y el docs/15 resta por ítems de categoría de equipos, así que
la compra de aparatos queda bajo el umbral igual.

## D-38 — Abreviaturas en el nombre del listado

Se agrega a `KEYWORDS` bajo `WEB_DEVELOPMENT`, peso 5.

```ts
/*
 * D-38. El listado corta el nombre a 50 caracteres y los compradores abrevian.
 * "SERV. PLAT. INFORMATICA DE REG. CONTROL Y SEGUI." puntuaba 2 y entraba solo
 * por la puerta de ficha en umbral-1. Con umbral 4 habria quedado fuera sin pedir
 * nunca la descripcion.
 */
[
  "WEB_DEVELOPMENT",
  5,
  "plat\\.? ?(inform|tecnol|web|digital)|sist\\.? ?(de )?(reg|control|seg|gest)|serv\\.? ?(de )?(software|plat|sist)|\\bsw\\b (de|para)",
],
```

## D-39 — Señales de incumbente con nombre propio

Se extiende `INCUMBENT_SIGNALS`. No restan puntaje; etiquetan.

```ts
const INCUMBENT_SIGNALS =
  "continuar|continuidad|actualmente (en uso|utilizado)|sistema actual|migracion|renovacion|renovar|proveedor actual" +
  /*
   * D-39. Nombres propios de proveedores instalados que aparecieron en bases o
   * descripciones de septiembre. Ver el nombre del competidor en la ficha vale
   * mas que una senal generica.
   */
  "|cas chile|rayen|geovictoria|zecovery|ceropapel|e-?delphyn|softland|smc|sistemas modulares" +
  // Bases escritas alrededor de un sistema en produccion.
  "|en caso de (seguir|cambiar) (con el |de )?(mismo |actual )?proveedor|sistemas? (actualmente )?en (uso|produccion)|no podra disminuir las capacidades";
```

## D-40 — Señales de oportunidad (tipo de regla nuevo)

Espejo de `INCUMBENT_SIGNAL`: etiqueta positiva, sin peso. Requiere `RULE_KINDS.OPPORTUNITY_SIGNAL`, su
entrada en `TIPOS_REGLA` de `rule-kinds.ts` y un campo `opportunitySignals String[]` en `Tender`.

```ts
/*
 * D-40. Dos condiciones cambian la cancha: un relanzamiento (el primer llamado
 * quedo desierto: Alto Hospicio y Coyhaique) y la reserva para empresas de
 * menor tamano (art. 182 del reglamento: deja fuera a los grandes). Se muestran
 * como etiqueta, igual que las de incumbente, para que quien revise las vea.
 */
const OPPORTUNITY_SIGNALS =
  "segundo llamado|2do llamado|tercer llamado|deja sin efecto.*(decreto|resolucion)|declarada desierta" +
  "|empresas? de menor tamano|\\bemt\\b|articulo 182";
```

```ts
OPPORTUNITY_SIGNAL: {
  titulo: "Señales de oportunidad",
  descripcion:
    "No suman puntaje. Marcan relanzamientos y procesos reservados a empresas de menor tamaño, donde la competencia es distinta.",
  peso: false,
  destino: null,
  orden: false,
  agregar: "Agregar señal de oportunidad",
},
```

## D-43 — APPOINTMENTS es tema, no sistema (11-09-2026)

Primer día de barrido con las reglas de septiembre: "GESTION DOCUMENTAL Y DIGITAL MUNICIPALIDAD TILTIL"
(3666-12-LE26) y "SERVICIOS PROFESIONALES PERSONAL APOYO INFORMATICA" (1057539-138-LP26) quedaron como
APPOINTMENTS porque `recordatorio|whatsapp|chatbot|inasistencia` pesaban 6, y DOCUMENT_MGMT con 5 perdía el
empate. Misma lección de D-29 y D-35.

```ts
["APPOINTMENTS", 6, "agendamiento|confirmacion de (citas|horas)|recordatorio de (citas|horas|atencion)|reserva de horas|contactabilidad"],
// junto a los otros temas de peso 2:
["APPOINTMENTS", 2, "recordatorio|whatsapp|chatbot|inasistencia"],
```

Y DOCUMENT_MGMT sube de 5 a **6** y pasa **delante** de APPOINTMENTS: Tiltil también nombra un módulo de agendamiento,
así que con 6 y 6 empataban y ganaba la primera. Un gestor documental con agenda es gestor documental.

## D-44 — Dos exclusiones por naturaleza que faltaban en D-36 (11-09-2026)

Puerto Montt (1057539-138-LP26, staffing con otra redacción), FONASA "PLATAFORMA DE OBSERVABILIDAD AVANZADA
MULTICLOUD" (591-26-LP26), Subtrans "SERVICIO TECNOLÓGICO INTEGRAL RED REGIONAL" (577290-2-LP26) y FOSIS
"Administracion infraestructura tecnológica" (762-7-LP26) pasaban el umbral. Se agregan a `EXCLUSIONS` (peso −6):

```ts
// Suministro de personal con otra redaccion.
"servicios profesionales (de )?(personal|apoyo)|personal de apoyo|apoyo informatico|horas hombre|\\bhh\\b",
// Infraestructura y monitoreo: la familia que D-18 dejo fuera del alcance, igual que ciberseguridad.
"observabilidad|multicloud|monitoreo de (infraestructura|red|servidores)|\\bapm\\b|administracion de infraestructura|servicio tecnologico integral",
```

## Orden final recomendado de `KEYWORDS`

1. DOCUMENT_MGMT 6 (D-43: delante de APPOINTMENTS, porque entre pesos iguales gana la primera)
2. APPOINTMENTS 6
3. MAINTENANCE 6, ATTENDANCE 6, PHARMA_LOGISTICS 6 (D-37)
4. FIXED_ASSETS 6 (D-35)
5. QUALITY_ACCREDITATION 6
6. Temas con peso 2 (D-29, D-35 y D-43)
7. WEB_DEVELOPMENT 5 (genérica) y WEB_DEVELOPMENT 5 abreviaturas (D-38)
8. WEB_DEVELOPMENT 4
9. OTHER 3 y OTHER 2

## Lo que estas reglas NO resuelven

UFRO y Bulnes siguen con puntaje de texto 11: su vocabulario es legítimamente de software. Bajan de las
viables solo con el docs/15, y se descartan de verdad solo con la revisión del docs/16.
