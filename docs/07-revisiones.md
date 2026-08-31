# 07 — Revisiones: estados, motivos y notas (RF-06)

## Estados y transiciones
`NEW → IN_REVIEW → VIABLE | DISCARDED` · `VIABLE → SUBMITTED → AWARDED | LOST` · desde cualquier estado se puede volver a `IN_REVIEW` (con nota). `DISCARDED` puede reabrirse si cambian las bases o las respuestas del foro. Toda transición crea una `Review` y actualiza `Tender.reviewStatus`.

## Catálogo de motivos (códigos fijos; se muestran en español)
Descarte:
| Código | Texto en la interfaz |
|---|---|
| EXP_MIN | Exige experiencia mínima (contratos o años) como requisito |
| EXP_PESO | Experiencia con peso alto en la evaluación sin poder acreditarla |
| CERT_ISO | Exige certificación ISO 27001 u otra norma |
| CERT_INTEROP | Exige certificación de interoperabilidad (HL7, CENS, HIS del comprador) |
| INTEG_ACRED | Exige integraciones acreditadas (ClaveÚnica, FirmaGob, DocDigital, PISEE, Rayen, TrakCare, AVIS) |
| PRODUCTO_NICHO | Requiere un producto especializado existente (ERP municipal, farmacia, LOD certificado, biometría) |
| INCUMBENTE | Bases escritas alrededor del proveedor actual (continuidad, migración, plazos imposibles) |
| PLAZO | Plazo de implementación o de cierre incompatible |
| MONTO | Monto fuera de rango (muy bajo para el esfuerzo o fuera de escala) |
| FORMA_PAGO | Documento tributario o forma de pago incompatible con el vehículo elegido |
| GARANTIA | Garantías o exigencias financieras fuera de alcance |
| HARDWARE | Incluye hardware, instalación en terreno o insumos |
| SIN_TIEMPO | Sin tiempo para preparar una oferta de calidad |
| OTRO | Otro (detallar en la nota) |

Viabilidad:
| Código | Texto |
|---|---|
| FIT_PRODUCTO | Calza con un producto existente (indicar cuál en la nota) |
| FIT_DESARROLLO | Desarrollo a medida dentro de nuestras capacidades |
| SIN_EXP_MIN | Sin mínimo de experiencia excluyente |
| EXP_PESO_BAJO | Experiencia con peso bajo o nulo |
| PRECIO_COMPETITIVO | Podemos ser competitivos en precio |
| MANDANTE_FAVORABLE | Comprador con historial favorable (persona natural, boleta, desarrollos pequeños) |

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
Texto libre, encabezado sugerido por la interfaz: "Por qué sí:" / "Por qué no:". Al pasar a VIABLE o DISCARDED se exige al menos un motivo y una nota de 20 caracteres o más. La nota de cierre (AWARDED/LOST) debe registrar el ganador, su precio y la lección aprendida: es la memoria de la empresa.

## Permisos
Revisor: crear revisiones y adjuntos, editar su propia nota dentro de las 24 horas. Administrador: todo, incluida la eliminación de adjuntos. Nadie borra revisiones: se corrigen con una nueva.

## Adjuntos (RF-07)
Tipos: Bases, Anexo, Foro, Acta, Otro. Formatos: PDF, DOCX, XLSX, ZIP; verificación por contenido, no por extensión; 50 MB por archivo; nombre en disco aleatorio; descarga solo con sesión. Sugerencia de nombre al subir: `<código>_<tipo>_<n>.<ext>`.
