# 07 — Revisiones: estados, motivos y notas (RF-06)

## Estados y transiciones
`NEW → IN_REVIEW → VIABLE | DISCARDED` · `VIABLE → SUBMITTED → AWARDED | LOST` · desde cualquier estado se puede volver a `IN_REVIEW` (con nota). `DISCARDED` puede reabrirse si cambian las bases o las respuestas del foro. Toda transición crea una `Review` y actualiza `Tender.reviewStatus`.

## Catálogo de motivos (códigos fijos; se muestran en español)

Cada motivo tiene **rótulo** y **explicación**. El rótulo es lo que se lee al escanear catorce opciones; la
explicación, lo que despeja la duda. Con la frase completa como única etiqueta, la lista se envolvía a tres
líneas por motivo y se volvía un muro.

Descarte:
| Código | Rótulo | Explicación |
|---|---|---|
| EXP_MIN | Experiencia mínima | Exige contratos o años como requisito habilitante |
| EXP_PESO | Experiencia con peso | Pesa alto en la evaluación y no podemos acreditarla |
| CERT_ISO | Certificación ISO | Exige ISO 27001 u otra norma |
| CERT_INTEROP | Interoperabilidad | Exige HL7, CENS o el HIS del comprador |
| INTEG_ACRED | Integraciones acreditadas | ClaveÚnica, FirmaGob, DocDigital, PISEE, Rayen, TrakCare, AVIS |
| PRODUCTO_NICHO | Producto de nicho | ERP municipal, farmacia, LOD certificado, biometría |
| INCUMBENTE | Proveedor instalado | Bases escritas alrededor del proveedor actual |
| PLAZO | Plazo incompatible | De implementación o de cierre |
| MONTO | Monto fuera de rango | Muy bajo para el esfuerzo, o fuera de escala |
| FORMA_PAGO | Forma de pago | Documento tributario incompatible con el vehículo |
| GARANTIA | Garantías | Exigencias financieras fuera de alcance |
| HARDWARE | Hardware o terreno | Incluye equipos, instalación o insumos |
| SIN_TIEMPO | Sin tiempo | No alcanza para una oferta de calidad |
| OTRO | Otro | Detallar en la nota |

Viabilidad:
| Código | Rótulo | Explicación |
|---|---|---|
| FIT_PRODUCTO | Calza con un producto | Indicar cuál en la nota |
| FIT_DESARROLLO | Desarrollo a medida | Dentro de nuestras capacidades |
| SIN_EXP_MIN | Sin mínimo de experiencia | No hay requisito excluyente |
| EXP_PESO_BAJO | Experiencia pesa poco | Peso bajo o nulo en la evaluación |
| PRECIO_COMPETITIVO | Precio competitivo | Podemos competir |
| MANDANTE_FAVORABLE | Comprador favorable | Persona natural, boleta, desarrollos pequeños |

## Quién deja la nota

La sesión es compartida por el equipo (D-22), así que el autor **no se deduce de quién inició sesión**.
Al entrar se elige un perfil —Andrés, Javiera o Francisco, de `Setting.teamMembers`— y todo lo que se
escriba queda a su nombre en `Review.authorName` sin volver a preguntarlo (D-24).

El autor **no viaja en el formulario**: lo pone el servidor desde el perfil activo. Enviarlo desde el
cliente permitiría firmar a nombre de otro editando el HTML, y eso lo dejaría sin servir ni como etiqueta.

La lista es cerrada, no texto libre: «Fran», «Francisco» y «francisco» quedarían como tres personas
distintas y el filtro por autor dejaría de servir.

Es un dato declarado, no verificado. Para tres personas que se conocen alcanza; si algún día hace falta
que sea verificable, son cuentas individuales (`docs/12` T-17).

## Nota
Texto libre, opcional (D-33). La versión original exigía un motivo y 20 caracteres al pasar a VIABLE o DISCARDED; se quitó porque el equipo se explica por WhatsApp y un formulario que obliga a escribir lo ya conversado produce notas de relleno. La sugerencia sigue en pie sin ser requisito: en el cierre (AWARDED/LOST), registrar ganador, precio y lección aprendida es la memoria de la empresa.

## Permisos
Con la cuenta compartida (D-22) los roles no distinguen a nadie: quien entra puede revisar, y cada revisión queda con el perfil que la hizo. Nadie borra revisiones: se corrigen con una nueva.

## Adjuntos
Descartados (D-33). Las bases se descargan del portal y se analizan fuera de la plataforma; el sistema no guarda archivos. El modelo `Attachment` queda en el schema sin pantalla, como los del histórico (D-27).
