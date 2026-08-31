# 03 — API pública de Mercado Público

Base: `https://api.mercadopublico.cl/servicios/v1/publico/`. Todas las llamadas llevan `ticket=<MP_API_TICKET>`. Respuestas JSON con `Cantidad`, `FechaCreacion`, `Listado`.

## Endpoints usados
| Uso | URL | Respuesta |
|---|---|---|
| Activas (barrido, RF-01) | `licitaciones.json?estado=activas` | Todas las licitaciones activas (≈ 4.600): `CodigoExterno`, `Nombre`, `CodigoEstado`, `FechaCierre`. Una sola llamada. |
| Ficha (RF-02) | `licitaciones.json?codigo=<código>` | Registro completo: `Nombre`, `Descripcion`, `Estado`, `Tipo`, `MontoEstimado`, `Moneda`, `TiempoDuracionContrato`, `UnidadTiempoDuracionContrato` (2 = días, 3 = semanas, 4 = meses, 5 = años; 0 y 1 aparecen siempre con duración 0 y se tratan como «sin informar». La 3 es una inferencia: sus valores, 10 y 36, serían absurdos en años), `Contrato`, `TomaRazon`, `Etapas`, `Fechas{FechaPublicacion, FechaInicio, FechaFinal (fin de preguntas), FechaPubRespuestas, FechaCierre, FechaAdjudicacion, FechaEstimadaAdjudicacion}`, `Comprador{CodigoOrganismo, NombreOrganismo, NombreUnidad, RegionUnidad, RutUnidad}`, `Items.Listado[]`, `Adjudicacion{Tipo, Fecha, Numero, NumeroOferentes, UrlActa}` cuando está adjudicada, y en cada ítem `Adjudicacion{RutProveedor, NombreProveedor, Cantidad, MontoUnitario}`. |
| Histórico diario (RF-08) | `licitaciones.json?fecha=ddmmaaaa&estado=adjudicada` | Licitaciones adjudicadas ese día (la fecha se refiere al evento, no a la publicación). |
| Organismo por fecha | `licitaciones.json?fecha=ddmmaaaa&CodigoOrganismo=<código>` | Licitaciones de ese organismo con evento ese día. |
| Organismos | `Empresas/BuscarComprador` | 899 organismos con `CodigoEmpresa` y `NombreEmpresa`; base para clasificar el tipo de comprador. |
| Órdenes de compra (opcional) | `ordenesdecompra.json?codigo=<código OC>` | No se usa en esta versión. |

## Límites y comportamiento observado (agosto 2026)
- Con ticket propio, llamadas a menos de ~3 segundos devuelven `{"Codigo":10500,"Mensaje":"Lo sentimos. Hemos detectado que existen peticiones simultáneas..."}`. Regla: **3,5 s mínimo entre llamadas** (`MP_MIN_INTERVAL_MS`), y ante 10500 esperar 5, 8, 11 y 14 s antes de cada reintento. Son **cuatro reintentos**, o sea cinco llamadas en total: leerlo como cuatro llamadas dejaria la espera de 14 s sin usar nunca. Registrar reintentos en `JobRun.counters`.
- Cuota: 10.000 consultas diarias por ticket. Un barrido normal usa 1 llamada de listado más una ficha por licitación nueva seleccionada (típicamente 5–40). El histórico diario usa 1 llamada por día más una ficha por coincidencia.
- El listado de activas cambia poco entre horas: comparar códigos contra la base antes de pedir fichas.
- `MontoEstimado` puede venir nulo (`Estimacion` = 2, monto no publicado). `Moneda` puede ser `CLF` o `USD`.
- Las fechas vienen sin zona horaria; se interpretan como hora de Chile.

## Cliente (`src/lib/mp/client.ts`)
- Una cola con un solo consumidor y `MP_MIN_INTERVAL_MS` entre llamadas (`p-limit(1)` más una espera).
- `getActive()`, `getTender(code)`, `getAwardedOn(date)`, `getBuyers()`.
- Respuesta cruda guardada en `Tender.raw`; errores tipados: `RateLimited`, `NotFound`, `Upstream`.

## Actas de adjudicación (RF-08)
`Adjudicacion.UrlActa` (`http://www.mercadopublico.cl/Procurement/Modules/RFB/StepsProcessAward/PreviewAwardAct.aspx?qs=...`) es HTML público, sin sesión. Parseo con cheerio sobre el texto plano:
1. Sección "Resultado de la Adjudicación": para cada ítem, filas `RUT · nombre del oferente · especificación · $ monto · cantidad · total · estado` con estado `Adjudicada`, `No Adjudicada`, `Rechazada`, `Desierta` o `Inadmisible`.
2. "Monto Neto Estimado del Contrato" y "Monto Neto Adjudicado".
3. Montos menores a 10.000 se marcan `unitPrice = true` (precio por interacción o por unidad; frecuente en contactabilidad).
La expresión regular de referencia está en `referencia/hist.py` y en el registro de esta semana: `(\d{1,2}\.\d{3}\.\d{3}-[\dkK])\s+(.+?)\s+\$\s+([\d\.]+)\s+(\d+)\s+(\d+)\s+(Adjudicada|No Adjudicada|Rechazada|Desierta|Inadmisible)`. Guardar el texto del acta en `HistoricalAward.raw` para reparsear si cambia el formato.

## Lo que la API no entrega
Adjuntos (bases, anexos, respuestas del foro): se descargan a mano desde el portal y se adjuntan a la ficha (RF-07).
