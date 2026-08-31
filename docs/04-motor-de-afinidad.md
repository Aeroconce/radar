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
| FIXED_ASSETS | 6 | `activos? fijos?|gestion de activos|control de inventario|bienes de uso|inventario` |
| QUALITY_ACCREDITATION | 6 | `acreditacion|seguridad del paciente|eventos adversos|autorizacion sanitaria|gestion de calidad` |
| DOCUMENT_MGMT | 5 | `gestion documental|archivo digital|digitalizacion|documentos electronicos|expediente|oficina de partes|gestor documental` |
| WEB_DEVELOPMENT | 5 | `desarrollo (de )?(sistema|software|plataforma|aplicaci|sitio|portal|web)|sistema informatico|plataforma (web|digital|informatica|tecnol)|aplicacion (web|movil)|app movil|sitio web|pagina web|portal web|sistema de gestion|sistemas? de informacion|sistema de (registro|control|seguimiento)|plataforma para|solucion informatica` |
| WEB_DEVELOPMENT | 4 | `saas|arriendo (de )?software|licenciamiento de sistema|software (de|para|cloud|en)|implementacion (de )?software|servicio de software|solucion tecnol` |
| OTHER | 3 | `mesa de ayuda|help ?desk|tickets|intranet|extranet|dashboard|reporteria|interoperab|integracion (de |con )?(sistema|plataforma|dato|api|servicio)|tramite digital|e-?learning` |
| OTHER | 2 | `informatic[oa]|digital|tecnologic|software|web|aplicacion|sistema` |

Exclusiones (peso −6): hardware y equipos (`impresor|computador|notebook|equipamiento computacional|switch|\\bups\\b|hardware|camara|cctv|telefonia|internet|enlace|fibra`), licencias comerciales (`licencias? .*(microsoft|office|adobe|windows|antivirus|autocad|autodesk|archicad|arcgis|matlab|sap|oracle|vmware|fortinet|veeam)|renovacion .*licencias|suscripcion .*(software|licencias)`), insumos y laboratorio (`toner|insumos|reactivos|equipos de laboratorio|banco de sangre`), servicios no informáticos (`\\bcurso|capacitacion en|diplomado|taller|asesoria|consultoria|levantamiento|inventario (fisico|de bienes)|regularizacion del activo|actualizacion activo fijo|monitoreo ambiental|digitalizacion masiva|servicio de digitalizacion|impresion|imprenta|senaletica|diseno grafico`), sistemas que no son software (`sistema de (riego|alarma|climatizaci|aire|iluminaci|extinci|calefacci|audio|sonido|bombeo|seguridad electr|control de acceso|deteccion|vigilancia)|sistema electrico|sistema fotovoltaico`), fuera de perfil (`remuneraciones|gdp|forense|erp municipal|software integral .*municipal`).

Reglas de comprador (`BUYER_PATTERN`, para `BuyerType`): `hospital|instituto nacional|clinica` → HOSPITAL; `servicio de salud|s\.s\.|red asistencial|crs |cesfam` → HEALTH_SERVICE; `direccion de salud|departamento de salud|das |corporacion municipal` → MUNICIPAL_HEALTH; `municipalidad|i\. municipalidad|ilustre` → MUNICIPALITY; `universidad|centro de formacion tecnica|cft|instituto profesional` → HIGHER_EDUCATION; resto público → PUBLIC_SERVICE. Se aplica sobre `NombreOrganismo` y `NombreUnidad`.

Señales de incumbente (`INCUMBENT_SIGNAL`, no restan puntaje; se muestran como etiqueta): `continuar|continuidad|actualmente (en uso|utilizado)|sistema actual|migracion|renovacion|renovar|proveedor actual`.

Rango de montos por defecto: sin mínimo; máximo 200.000.000. Las que lo superan **no se descartan**: se marcan `Tender.outOfScale`, se muestran con etiqueta "fuera de escala" y restan 2 de afinidad.

Tipos de proceso seleccionados: **L1, LE, LP, LQ**, y **LR** con la etiqueta anterior. **`LS` no se selecciona** (servicios personales especializados, fuera del perfil), aunque el modelo lo representa porque la API puede devolverlo (`docs/02`). Configurable en `Setting`.

> La regla de peso 3 se acotó el 2026-08-30 (D-18). Salió `encuesta`, `oirs`, `tramites`, `automatizacion` y
> `transparencia`: nombran un trámite, una oficina o un aparato, y traían al tablero seis encuestas, un portón
> y un ascensor. `integracion` ahora pide contexto de sistemas, porque sola matcheaba «Centro de Integración
> del Adulto Mayor». **Ciberseguridad y ethical hacking quedan fuera** por la misma decisión: no son desarrollo
> ni arriendo de sistemas.

### Límites de palabra

Dos términos de exclusión llevan `\\b` a propósito. Sin él, **`curso` matchea dentro de «recursos»** y
restaba 6 puntos a licitaciones de desarrollo por una frase administrativa tan común como «los recursos
involucrados»: ocurría en 5 de las 87 fichas de la semilla, incluida una de «desarrollo de un sistema
informático» que quedó fuera del tablero. `ups` haría lo mismo dentro de «backups».

El resto **no** lleva límite porque son prefijos deliberados: `interoperab`, `climatizaci`, `aplicaci`,
`solucion tecnol`. Agregarles `\\b` al final los rompería.

## Casos de prueba obligatorios (`tests/affinity.test.ts`)
Deben seleccionarse: "SS. Contactabilidad de pacientes vía WhatsApp"; "ADQUISICION SERVICIO DE SISTEMA INFORMATIVO DE GESTION DOCUMENTAL"; "SOLUCIÓN INFORMÁTICA INSTITUCIONAL PARA EL CFT"; "SISTEMA INFORMATICO WEB PARA CENTROS DE SALUD"; "ARRIENDO SOFTWARE FARMACIA Y OPTICA MUNICIPAL" (sin "de"; se escapó en agosto de 2026); "Sistema de gestión de Libro de Obras Digital"; "Servicio de Metodología de Contactabilidad".
No deben seleccionarse: "ADQUISICIÓN DE REACTIVOS PARA SISTEMA INFORMÁTICO DE LABORATORIO"; "RENOVACIÓN DE LICENCIAS ADOBE"; "SERV DE ACTUALIZACION ACTIVO FIJO E INVENTARIO" (levantamiento físico); "Curso de capacitación en software estadístico"; "Sistema de riego automatizado"; "ARRIENDO DE SOFTWARE INTEGRAL PARA LA GESTIÓN MUNICIPAL" (ERP).

## Vertical y tipo de comprador

La vertical es la de la regla de palabra clave de **mayor peso** que coincida. Las reglas de peso bajo son
genéricas («software», «sistema») y coinciden casi siempre; tomar la de mayor peso hace que gane la más
específica. Los empates los resuelve el orden de la tabla: gana la primera. Por eso «Desarrollo sistema de
gestión documental» queda en DOCUMENT_MGMT y no en WEB_DEVELOPMENT, que pesa lo mismo pero viene después.

El tipo de comprador funciona igual pero sin pesos: gana el primer patrón que coincide, porque se solapan
a propósito. Un hospital dependiente de un municipio sigue siendo un hospital, y HOSPITAL va antes.

## Vista previa (RF-09)
Al editar reglas, un botón "Probar con las activas de hoy" recalcula sobre `SeenTender` (la última lista de activas guardada, sin llamar a la API) y muestra cuántas y cuáles entrarían y cuáles saldrían respecto de las reglas vigentes. Guardar exige confirmar.
