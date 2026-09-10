# 04 — Motor de afinidad (RF-01, RF-03, RF-09)

**Alcance: desarrollo y arriendo de sistemas.** Ese es el negocio y es lo único que el radar selecciona. Un servicio que no se entrega como software no entra, por afin que suene su tema: una encuesta, la mantención de un ascensor o una asesoría de inventario quedan fuera aunque hablen de datos, automatización o activos fijos.

Dentro de ese alcance el criterio es amplio: dejar pasar todo lo que pueda interesar y ordenarlo, porque una licitación relevante que no aparece cuesta más que veinte irrelevantes que sí. El umbral se fija bajo y se sube con datos.

Las verticales (contactabilidad, activos fijos, gestión documental, calidad) describen **de qué trata el sistema**, no reemplazan la exigencia de que sea un sistema. Por eso «Servicio de Contactabilidad de Pacientes» entra — se entrega como plataforma — y «Encuesta de caracterización» no.

## Entrada
Nombre y descripción (la descripción solo está en la ficha; el primer filtro usa el nombre del listado y, si el puntaje queda a un punto del umbral, se pide la ficha y se recalcula con la descripción).

## Cálculo
`score = Σ pesos de palabras clave coincidentes (una vez por regla) − Σ pesos de exclusiones coincidentes`. Se normaliza el texto a minúsculas sin tildes antes de evaluar; las expresiones regulares se escriben sin tildes. Umbral inicial: **3** (configurable en `Setting`).

## Reglas iniciales (semilla; editables desde la interfaz)
Palabras clave (peso):
| Vertical | Peso | Expresión |
|---|---|---|
| APPOINTMENTS | 6 | `agendamiento|confirmacion de (citas|horas)|recordatorio|whatsapp|chatbot|reserva de horas|contactabilidad|inasistencia` |
| MAINTENANCE | 6 | `gestion de mantenimiento|mantenimiento (preventivo|correctivo)|ordenes? de trabajo|\\bcmms\\b|componentes (de|vinculados a) mantenimiento|plan de mantencion` |
| ATTENDANCE | 6 | `control de asistencia|asistencia del personal|reloj control|marcaje|marcacion|biometri` |
| PHARMA_LOGISTICS | 6 | `drogueria|bodega de farmacia|abastecimiento farmaceutico|logistica de medicamentos` |
| FIXED_ASSETS | 6 | `(software|sistema|plataforma|gestion|control) de activos? fijos?|activos? fijos? (institucional|municipal)|control de inventario|bienes de uso` |
| QUALITY_ACCREDITATION | 6 | `seguridad del paciente|eventos adversos|autorizacion sanitaria|gestion de calidad` |
| DOCUMENT_MGMT | 5 | `gestion documental|archivo digital|digitalizacion|documentos electronicos|gestor documental` |
| QUALITY_ACCREDITATION | 2 | `acreditacion` |
| FIXED_ASSETS | 2 | `inventario` |
| FIXED_ASSETS | 2 | `activos? fijos?|gestion de activos` |
| DOCUMENT_MGMT | 2 | `expediente|oficina de partes` |
| WEB_DEVELOPMENT | 5 | `desarrollo (de )?(la |el |un |una )?(sistema|software|plataforma|aplicaci|sitio|portal|web)|sistema informatico|plataforma (web|digital|informatica|tecnol)|aplicacion (web|movil)|app movil|sitio web|pagina web|portal web|sistema de gestion|sistemas? de informacion|sistema de (registro|control|seguimiento)|plataforma para|solucion informatica` |
| WEB_DEVELOPMENT | 5 | `plat\\.? ?(inform|tecnol|web|digital)|sist\\.? ?(de )?(reg|control|seg|gest)|serv\\.? ?(de )?(software|plat\\b|sist\\b)|\\bsw\\b (de|para)` (abreviaturas, D-38) |
| WEB_DEVELOPMENT | 4 | `saas|arriendo (de )?software|arriendo (de )?(un |una |el |la )?(sistema|plataforma)|suscripcion (anual )?(de |a )?(un |una |la )?(sistema|plataforma)|contratacion (de )?software|licenciamiento de sistema|software (de|para|cloud|en)|implementacion (de )?software|servicio de software|mejora evolutiva|mantenimiento evolutivo|soporte evolutivo|migracion de (base de )?datos|solucion tecnol` |
| OTHER | 3 | `mesa de ayuda|help ?desk|tickets|intranet|extranet|dashboard|reporteria|interoperab|integracion (de |con )?(sistema|plataforma|dato|api|servicio)|tramite digital|e-?learning` |
| OTHER | 2 | `informatic[oa]|digital|tecnologic|software|web|aplicacion|sistema|plataforma` |

Exclusiones (peso −6): hardware y equipos (`impresor|computador|notebook|equipamiento computacional|equipos? tecnologic|equipos? medic|switch|\\bups\\b|hardware|camara|cctv|telefonia|internet|enlace|fibra`), licencias comerciales (`licencias? .*(microsoft|office|adobe|windows|antivirus|autocad|autodesk|archicad|arcgis|matlab|sap|oracle|vmware|fortinet|veeam)|renovacion .*licencias|suscripcion .*(software|licencias)`), insumos, laboratorio y prestaciones a terceros (`toner|insumos|reactivos|equipos de laboratorio|banco de sangre|examenes de laboratorio|extrasistema|prestaciones medicas`), servicios no informáticos (`\\bcurso|capacitacion en|diplomado|taller|asesoria|consultoria|levantamiento|inventario (fisico|de bienes)|regularizacion del activo|actualizacion activo fijo|monitoreo ambiental|digitalizacion masiva|servicio de digitalizacion|impresion|imprenta|senaletica|diseno grafico`), sistemas que no son software (`sistema de (riego|alarma|climatizaci|aire|iluminaci|extinci|calefacci|audio|sonido|bombeo|seguridad electr|control de acceso|deteccion|vigilancia)|sistema electrico|sistema fotovoltaico`), fuera de perfil (`remuneraciones|gdp|forense|erp municipal|software integral .*municipal`), ciberseguridad (`ciberseguridad|ethical hacking|hacking etico|pentest|\bwaf\b|\bsiem\b|firewall|antimalware`) concesiones (`\bconcesion`) y compra de licencias (`licencias? de software|adquisicion de licencias?|provision de licencias?|compra de licencias?|venta de licencias?|suministro de licencias?|compra de uso de`). La compra de licencias es reventa, no desarrollo ni arriendo (D-30); a propósito **no** se excluye `licencia` sola ni `licenciamiento`: la palabra aparece en sistemas legítimos, como la toma de horas de licencias de conducir o un SaaS «con licenciamiento ilimitado».

Desde el 10-09-2026 se excluye también por **naturaleza del contrato** (D-36), una línea por cada una: sistemas clínicos (`registro clinico|ficha clinica|\\brce\\b|\\blis\\b|\\bpacs\\b|\\bhis\\b|laboratorio clinico|anatomia patologica`), suministro de personal (`turnos profesionales|suministro de personal|provision de profesionales|servicio de turnos (de|para)`), agencias de medios (`difusion (en medios|de la campana|publicitaria)|(planificacion|produccion|implementacion) en medios|campana (publicitaria|comunicacional|de difusion)|publicidad|avisaje|medios de comunicacion`), seguros (`seguros? (contra|de|anual|general)|poliza de seguro|siniestr|compania de seguros`), plataforma integral (`plataforma integral|sistema integral de gestion|\\berp\\b`) y producto comercial por categoría (`software de diseno|\\bcad\\b|\\bbim\\b|revision de modelos|\\bitam\\b|\\bsam\\b`). Las tres primeras exigen contexto a propósito: «sistema de turnos» sigue entrando (es control de asistencia), y un módulo de difusión dentro de un sistema no se bota.

Reglas de comprador (`BUYER_PATTERN`, para `BuyerType`): `hospital|instituto nacional|clinica` → HOSPITAL; `servicio de salud|s\.s\.|red asistencial|crs |cesfam` → HEALTH_SERVICE; `direccion de salud|departamento de salud|das |corporacion municipal` → MUNICIPAL_HEALTH; `municipalidad|i\. municipalidad|ilustre` → MUNICIPALITY; `universidad|centro de formacion tecnica|cft|instituto profesional` → HIGHER_EDUCATION; resto público → PUBLIC_SERVICE. Se aplica sobre `NombreOrganismo` y `NombreUnidad`.

Señales de incumbente (`INCUMBENT_SIGNAL`, no restan puntaje; se muestran como etiqueta): `continuar|continuidad|actualmente (en uso|utilizado)|sistema actual|migracion|renovacion|renovar|proveedor actual`, más los nombres propios de proveedores instalados que aparecieron en septiembre de 2026 (`cas chile|rayen|geovictoria|zecovery|ceropapel|e-?delphyn|softland|smc|sistemas modulares`) y las frases de bases escritas alrededor de un sistema en producción (`en caso de (seguir|cambiar) (con el |de )?(mismo |actual )?proveedor|sistemas? (actualmente )?en (uso|produccion)|no podra disminuir las capacidades`) (D-39).

Señales de oportunidad (`OPPORTUNITY_SIGNAL`, espejo de las anteriores: etiqueta positiva, sin peso por regla; D-40): `segundo llamado|2do llamado|tercer llamado|deja sin efecto.*(decreto|resolucion)|declarada desierta|empresas? de menor tamano|\\bemt\\b|articulo 182`. Un relanzamiento tras un llamado desierto y la reserva para empresas de menor tamaño (art. 182 del reglamento) cambian la competencia, y quien revise debe verlo. Se guardan en `Tender.opportunitySignals`.

Rango de montos por defecto: sin mínimo; máximo 200.000.000. Las que lo superan **no se descartan**: se marcan `Tender.outOfScale`, se muestran con etiqueta "fuera de escala" y restan 2 de afinidad.

Tipos de proceso seleccionados: **L1, LE, LP, LQ**, y **LR** con la etiqueta anterior. **`LS` no se selecciona** (servicios personales especializados, fuera del perfil), aunque el modelo lo representa porque la API puede devolverlo (`docs/02`). Configurable en `Setting`.

> La regla de peso 3 se acotó el 2026-08-30 (D-18). Salió `encuesta`, `oirs`, `tramites`, `automatizacion` y
> `transparencia`: nombran un trámite, una oficina o un aparato, y traían al tablero seis encuestas, un portón
> y un ascensor. `integracion` ahora pide contexto de sistemas, porque sola matcheaba «Centro de Integración
> del Adulto Mayor». **Ciberseguridad y ethical hacking quedan fuera** por la misma decisión: no son desarrollo
> ni arriendo de sistemas.

### Un tema no es un sistema

Las verticales describen **de qué trata** el sistema. Cuatro términos nombraban solo el tema —`acreditacion`,
`inventario`, `expediente`, `oficina de partes`— y con peso 6 o 5 llegaban solos al umbral: traían al tablero
el arriendo de una embarcación, una acreditación de saberes lingüísticos, servicios profesionales para una
autoevaluación y la reestructuración de una oficina.

Desde el 31-08-2026 pesan **2** (D-29). Bajo el umbral por sí mismos, entran solo acompañados de una palabra
que sí diga sistema: «sistema de acreditación» suma 2 + 2 y pasa; «acreditación de saberes lingüísticos» se
queda en 2. Es lo que este documento ya decía y el motor no cumplía.

Van **antes** de la regla genérica de peso 2 en la tabla: con el mismo peso gana la primera, así la vertical
que se asigna sigue siendo la específica y no «Otros».

Sobre el barrido del 27-08-2026 la selección baja de 25 a 19 de 40. Las seis que salen están declaradas una
por una en `tests/baseline.test.ts`.

### Límites de palabra

Dos términos de exclusión llevan `\\b` a propósito. Sin él, **`curso` matchea dentro de «recursos»** y
restaba 6 puntos a licitaciones de desarrollo por una frase administrativa tan común como «los recursos
involucrados»: ocurría en 5 de las 87 fichas de la semilla, incluida una de «desarrollo de un sistema
informático» que quedó fuera del tablero. `ups` haría lo mismo dentro de «backups».

El resto **no** lleva límite porque son prefijos deliberados: `interoperab`, `climatizaci`, `aplicaci`,
`solucion tecnol`. Agregarles `\\b` al final los rompería.

### Auditoría del 31-08-2026 (D-31)

Se auditaron las 4.721 activas del día por los dos lados: las seleccionadas leídas una a una, y las
descartadas con olor a sistema revisadas con su puntaje y la regla que las frenó. Del lado que descarta, el
motor estaba bien: riego, incendios, bombas y micrófonos quedaban fuera por puntaje. Del lado que selecciona
aparecieron **seis falsos negativos reales**, todos por huecos de escritura de las reglas, no de criterio:
el patrón de desarrollo no admitía artículos («desarrollo de **la** plataforma» puntuaba 0, y era la
plataforma de compras de ChileCompra), `arriendo de sistema` no existía aunque el alcance se llama así,
`suscripcion de sistema` tampoco, y `plataforma` faltaba en la regla genérica. Los seis quedaron como casos
obligatorios de selección.

### Muestra de septiembre de 2026 (D-35 a D-40)

Veinte licitaciones revisadas a mano entre el 3 y el 10 de septiembre (5 viables, 14 descartes, 1 ofertada) mostraron
que el recall era bueno y la precisión no: **13 de las 14 trampas entraban al tablero**, y dos rankeaban sobre cuatro
viables. El diagnóstico completo está en `docs/13`; las reglas que salieron de ahí, en `docs/14`; los 20 casos son
el fixture `tests/fixtures/casos-septiembre-2026.ts` y se prueban en `tests/affinity.test.ts`. En resumen: «activo
fijo» pasó a ser tema y no sistema (D-35, como D-29); se excluye por naturaleza del contrato (D-36); existen las
verticales MAINTENANCE, ATTENDANCE y PHARMA_LOGISTICS (D-37); las abreviaturas del listado puntúan (D-38); las
señales de incumbente conocen nombres propios (D-39); y hay señales de oportunidad (D-40). Lo que el texto no puede
resolver —UFRO y Bulnes siguen con 11 puntos porque su vocabulario es de software— lo tratan las señales
estructurales (`docs/15`) y la revisión estructurada (`docs/16`).

La regla de abreviaturas se acotó al aplicarla: `plat` y `sist` tras `serv` llevan límite de palabra, porque sin él
«SERV DE PLATAFORMA SIEM» sumaba 5 y volvía a entrar pese a la exclusión de ciberseguridad; lo detectó
`tests/baseline.test.ts`, que es exactamente para lo que existe.

## Casos de prueba obligatorios (`tests/affinity.test.ts`)
Deben seleccionarse: "SS. Contactabilidad de pacientes vía WhatsApp"; "ADQUISICION SERVICIO DE SISTEMA INFORMATIVO DE GESTION DOCUMENTAL"; "SOLUCIÓN INFORMÁTICA INSTITUCIONAL PARA EL CFT"; "SISTEMA INFORMATICO WEB PARA CENTROS DE SALUD"; "ARRIENDO SOFTWARE FARMACIA Y OPTICA MUNICIPAL" (sin "de"; se escapó en agosto de 2026); "Sistema de gestión de Libro de Obras Digital"; "Servicio de Metodología de Contactabilidad".
No deben seleccionarse: "ADQUISICIÓN DE REACTIVOS PARA SISTEMA INFORMÁTICO DE LABORATORIO"; "RENOVACIÓN DE LICENCIAS ADOBE"; "SERV DE ACTUALIZACION ACTIVO FIJO E INVENTARIO" (levantamiento físico); "Curso de capacitación en software estadístico"; "Sistema de riego automatizado"; "ARRIENDO DE SOFTWARE INTEGRAL PARA LA GESTIÓN MUNICIPAL" (ERP); "ADQUISICIÓN DE LICENCIAS DE SOFTWARE" y "Provisión de licencias de software" (reventa, D-30); "Contratación de Servicios para procesamiento y análisis de exámenes de laboratorio en el extrasistema" (prestación a terceros, D-30); "ADQUISICIÓN EQUIPOS TECNOLÓGICOS PARA REHABILITACIÓN" (hardware, D-30).

## Vertical y tipo de comprador

La vertical es la de la regla de palabra clave de **mayor peso** que coincida. Las reglas de peso bajo son
genéricas («software», «sistema») y coinciden casi siempre; tomar la de mayor peso hace que gane la más
específica. Los empates los resuelve el orden de la tabla: gana la primera. Por eso «Desarrollo sistema de
gestión documental» queda en DOCUMENT_MGMT y no en WEB_DEVELOPMENT, que pesa lo mismo pero viene después.

El tipo de comprador funciona igual pero sin pesos: gana el primer patrón que coincide, porque se solapan
a propósito. Un hospital dependiente de un municipio sigue siendo un hospital, y HOSPITAL va antes.

## Orden de las reglas
El orden es parte de la regla, no del montón de Postgres: `AffinityRule.position` lo fija (D-28) y todas las lecturas ordenan por él. La semilla lo numera con el orden de este documento, y la pantalla lo cambia con flechas donde importa —palabras clave y patrones de comprador—, no donde da lo mismo.

## Vista previa (RF-09)
Al editar reglas, un botón "Probar" recalcula sobre `SeenTender` (la última lista de activas guardada, sin llamar a la API) y muestra cuántas se seleccionan hoy, cuántas con el cambio, y las listas de las que entrarían y dejarían de entrar. Guardar exige confirmar.

Dos detalles que hacen que la vista previa no mienta:

- **Se puntúa con lo que el barrido tendría.** `SeenTender` guarda solo el nombre, pero el barrido pide la ficha y recalcula con la descripción cuando el nombre deja el puntaje cerca del umbral. Las que ya están en `Tender` se puntúan con nombre y descripción, que están guardadas; con el nombre solo, media docena de licitaciones del tablero aparecería como «saldría» cuando entró justamente por su descripción.
- **Se avisa cuando algo revisado sale.** Si una de las que dejarían de entrar ya tiene una revisión escrita, se dice aparte: es la señal de que el cambio toca algo sobre lo que el equipo ya decidió.

## Aplicar al tablero (RF-09)
Guardar una regla cambia lo que el radar traerá; no cambia lo que ya está en la lista. El barrido no vuelve a puntuar una licitación que ya existe en `Tender`: solo la refresca si cambió su fecha de cierre (`docs/05`). El botón «Recalcular el tablero» las vuelve a puntuar con las reglas de ahora, usando el nombre y la descripción guardados, sin llamar a la API. No borra ninguna: una que baja del umbral se queda con su puntaje nuevo, porque un cambio de regla no deshace lo que el equipo ya revisó.
