# 13 — Diagnóstico de precisión

## Plan de mejora de precisión (septiembre de 2026)

Documentos de trabajo para que el radar muestre **solo lo que Aeroconce puede ganar** y deje fuera los
patrones que hoy entran al tablero con puntaje alto sin ser del rubro.

Base empírica: **20 licitaciones revisadas a mano entre el 3 y el 10 de septiembre de 2026** (5 viables,
14 descartes, 1 ofertada). Cada regla propuesta viene de un caso real de esa muestra, siguiendo la misma
convención de decisiones numeradas de `docs/04` (aquí continúan desde **D-35**).

Son los documentos `docs/13` a `docs/19`:

| Doc | Qué contiene | Para qué sirve |
|---|---|---|
| `13-diagnostico-precision.md` | Simulación del motor actual sobre los 20 casos, antes y después | Entender qué falla y por qué |
| `14-reglas-de-texto.md` | Reglas nuevas y corregidas en el formato de `initial-rules.ts` (D-35 a D-40) | Pegar en la semilla |
| `15-senales-estructurales.md` | Puntaje por monto, duración, tipo de proceso e ítems (D-41) | Cambios en el worker |
| `16-revision-estructurada.md` | Cuatro campos que deciden la viabilidad y no están en el texto | Cambios en `Review` |
| `17-alertas-pipeline.md` | Avisos que faltaron esta semana y vigilancia de organismos | Cambios en notificaciones |
| `18-plan-de-implementacion.md` | Orden, esfuerzo, pruebas, métrica de precisión | Ejecutar con Claude Code |
| `19-casos-de-prueba.md` | Los 20 casos como fixtures con resultado esperado | `tests/affinity.test.ts` |

## Resultado esperado

Con el motor de hoy, **13 de las 14 trampas entran al tablero** y dos de ellas rankean por encima de cuatro
de las cinco viables. Con las reglas de texto más las señales estructurales, las cinco viables quedan entre
14 y 18 puntos, doce trampas quedan bajo el umbral, y las dos que no se pueden descartar por texto (UFRO y
Bulnes) quedan en 9, debajo de todas las viables y con etiqueta que explica por qué.

## Regla de oro que sale de la muestra

Lo que Aeroconce puede ganar tiene una forma reconocible:

- **Servicio o arriendo de software**, módulo único, con canon mensual entre $0,8M y $3,5M.
- **Sin producto comercial de terceros** (licencias, CAD, ITAM) y **sin bienes físicos**.
- **Sin sistema clínico** (RCE, LIS, HIS) ni **plataforma integral** de incumbente.
- Experiencia como **puntaje**, no como admisibilidad; verificación por **declaración o demo**, no por
  clientes en operación; **pago desde el mes 1**, no contra implementación completa.

Las tres primeras se detectan con texto y ficha (docs/14 y docs/15). La última solo se detecta leyendo las
bases, y por eso se captura en la revisión (docs/16).

---

## Método

Se replicó el motor de `src/lib/affinity/rules.ts` (misma normalización sin tildes, mismas reglas de
`initial-rules.ts`, umbral 3, puerta de ficha en umbral−1) y se corrió sobre 20 licitaciones revisadas a
mano entre el 3 y el 10 de septiembre. El texto usado es el nombre y la descripción tal como los devolvió
la API esos días; las descripciones guardadas en `Tender` pueden ser más largas y mover los valores
absolutos, no el patrón.

Clasificación manual: **VIABLE** (pasa los filtros del negocio), **TRAMPA** (entra al tablero pero no es
del rubro o no se puede ganar), **OFERTADA** (Sótero del Río, presentada en agosto).

## Resultado con el motor actual

| Caso | ID | Puntaje | Vertical | Diagnóstico |
|---|---|---|---|---|
| Los Libertadores | 1305541-3-LE26 | 14 | FIXED_ASSETS | ✅ viable |
| Coyhaique | 2494-81-LP26 | 12 | DOCUMENT_MGMT | ✅ viable |
| **UFRO** | 5586-128-LE26 | **11** | WEB_DEVELOPMENT | ✗ exige 20 clientes en operación |
| **Bulnes** | 3902-39-LP26 | **11** | WEB_DEVELOPMENT | ✗ ERP municipal, pago post-implementación |
| San Bernardo | 1274285-45-LP26 | 8 | WEB_DEVELOPMENT | ✅ viable (vertical equivocada) |
| JUNAEB ITAM | 85-41-LE26 | 8 | FIXED_ASSETS | ✗ reventa de licencias |
| Alto Hospicio | 3447-142-LE26 | 7 | WEB_DEVELOPMENT | ✅ viable (vertical equivocada) |
| Sótero del Río | 1057501-431-LE26 | 7 | WEB_DEVELOPMENT | ofertada (nombre puntúa solo 2) |
| Chile Cultura | 1725-196-LE26 | 7 | WEB_DEVELOPMENT | ✗ agencia de medios |
| San Borja turnos | 1057049-332-LR26 | 7 | WEB_DEVELOPMENT | ✗ suministro de personal |
| Peñalolén | 1973-93-LR26 | 7 | WEB_DEVELOPMENT | ✗ HIS con 5 integraciones clínicas |
| Ancud | 2048-57-LP26 | 6 | WEB_DEVELOPMENT | ✅ viable (vertical equivocada) |
| Seguro Magallanes | 2099-48-L126 | 6 | FIXED_ASSETS | ✗ póliza de seguro |
| IND deportes | 932-26-LE26 | 6 | FIXED_ASSETS | ✗ balones y raquetas |
| Exequiel LIS | 1057494-50-LR26 | 6 | WEB_DEVELOPMENT | ✗ laboratorio clínico |
| Aconcagua RCE | 2200-23-LR26 | 6 | WEB_DEVELOPMENT | ✗ registro clínico |
| Pichilemu CAD | 3810-23-LE26 | 6 | WEB_DEVELOPMENT | ✗ licencias CAD/BIM |
| Estación Central | 2434-20-LP26 | 5 | OTHER | ✗ plataforma integral de incumbente |
| Cauquenes servidor | 434-104-LE26 | 2 | OTHER | ✗ (queda fuera, correcto) |

**Lectura:** el recall es bueno (las cinco viables entran) pero **13 de 14 trampas también entran**, y el
orden está invertido: UFRO y Bulnes rankean sobre cuatro viables; Ancud empata con el seguro contra incendio
y con la implementación deportiva. Precisión en la muestra: 5 de 19 mostradas, ~26%.

## Los seis patrones que fallan

### P1 — "Activo fijo" es tema, no sistema
`activos? fijos?` con peso 6 mete solo al tablero: el seguro contra incendio "para bienes de uso de activo
fijo", la "implementación deportiva y activos fijos no financieros" y el ITAM de JUNAEB por "gestión de
activos TI". Es la misma lección de D-29, que bajó `inventario` a 2 por esta razón y no se aplicó a esta
regla. → docs/14, D-35.

### P2 — Se excluye por objeto físico, no por naturaleza del contrato
Las exclusiones cubren impresoras, licencias de marca, cursos, riego. Nueve de los catorce descartes son de
cinco naturalezas sin ninguna regla: sistemas clínicos, suministro de personal, publicidad, seguros y
plataforma integral. Además `software integral .*municipal` no atrapa "**plataforma** integral para gestión
municipal", y la exclusión de licencias exige la palabra "licencias" más una marca, así que "software de
diseño CAD" pasa. → docs/14, D-36.

### P3 — Las frases genéricas del comprador puntúan más que las específicas
"Plataforma tecnológica tipo SaaS" (UFRO) suma 11; "sistemas de información" con descripción (Bulnes) suma
11. Son las frases de los ERP de incumbente y de las licitaciones cuyo contenido real está en un adjunto
que la API no entrega. No se corrige con palabras clave: las palabras son correctas. Se corrige con
señales que ya están en `Tender` y no puntúan: monto, duración, tipo de proceso, ítems. → docs/15, D-41.

### P4 — Faltan las verticales del negocio real
Alto Hospicio (asistencia), San Bernardo (droguería), Ancud y Sótero del Río (mantenimiento) caen todos en
WEB_DEVELOPMENT. Si la vertical es el eje de priorización, hoy no se puede filtrar "mantenimiento" y ver los
dos CMMS. → docs/14, D-37.

### P5 — Nombres abreviados y truncados puntúan casi cero
La API corta el nombre a 50 caracteres y los compradores abrevian. "SERV. PLAT. INFORMÁTICA DE REG. CONTROL
Y SEGUI." (la ofertada) puntúa 2 por nombre; entra solo porque la puerta de ficha es umbral−1. Cualquier
subida del umbral la deja fuera sin pedir la descripción. → docs/14, D-38.

### P6 — Lo decisivo no está en ningún texto
Los 20 clientes de la UFRO, el pago post-implementación de Bulnes, el profesional responsable de JUNAEB y
el 79% de especificaciones de San Bernardo viven solo en las bases. Ninguna regla los ve. Se capturan en
la revisión como datos estructurados, para que la segunda vez que aparezca el patrón el radar ya lo sepa.
→ docs/16.

## Resultado con las correcciones (docs/14 y docs/15)

| Caso | Hoy | Texto corregido | Ajuste estructural | **Total** | Etiquetas |
|---|---|---|---|---|---|
| Los Libertadores | 14 | 16 | +2 | **18** | canon ok |
| Sótero del Río | 7 | 18 | 0 | **18** | MAINTENANCE |
| San Bernardo | 8 | 14 | +2 | **16** | PHARMA_LOGISTICS, canon ok |
| Alto Hospicio | 7 | 13 | +2 | **15** | ATTENDANCE, canon ok |
| Coyhaique | 12 | 12 | +2 | **14** | canon ok |
| Ancud | 6 | 12 | +2 | **14** | MAINTENANCE, canon ok |
| UFRO | 11 | 11 | −2 | **9** | canon 0,7M, sin descripción útil |
| Bulnes | 11 | 11 | −2 | **9** | canon 7,6M, señal incumbente |
| Peñalolén | 7 | 7 | −4 | **3** | LR, canon 6,9M |
| Seguro Magallanes | 6 | 2 | −2 | **0** | — |
| Chile Cultura | 7 | 1 | −2 | **−1** | — |
| Aconcagua RCE | 6 | 0 | −2 | **−2** | LR |
| Pichilemu CAD | 6 | 0 | −2 | **−2** | compra única |
| San Borja turnos | 7 | 1 | −4 | **−3** | LR |
| Estación Central | 5 | −1 | −2 | **−3** | — |
| Exequiel LIS | 6 | 0 | −4 | **−4** | LR |
| JUNAEB ITAM | 8 | −2 | −2 | **−4** | canon 0,6M |
| Cauquenes servidor | 2 | −4 | −2 | **−6** | compra única |
| IND deportes | 6 | −4 | −2 | **−6** | compra única |

Las cinco viables y la ofertada quedan entre 14 y 18. Doce trampas bajan del umbral. UFRO y Bulnes siguen
en el tablero con 9, porque su texto es legítimamente de software; lo que las descarta está en las bases y
lo captura el docs/16. Peñalolén queda al borde (3): un LR de 60 meses con canon de $6,9M merece revisión
rápida, no descarte automático, y la etiqueta lo dice.
