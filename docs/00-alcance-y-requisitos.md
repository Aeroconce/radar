# 00 — Alcance y requisitos

## Qué es
Un radar: consulta la API pública de Mercado Público de forma periódica, selecciona las licitaciones que calzan con el perfil de Aeroconce, las ordena por afinidad y fecha de cierre, y ofrece un tablero compartido donde el equipo registra la revisión manual de cada una (estado, motivos, nota, bases adjuntas).

## Qué no es
- No descarga bases ni anexos: la API pública no los entrega. La descarga es manual desde el portal y el archivo se adjunta a la ficha.
- No busca servicios que no sean software: el alcance es **desarrollo y arriendo de sistemas** (`docs/04`). Una encuesta, una asesoría o la mantención de un equipo no entran aunque su tema suene afín.
- No calcula probabilidades de adjudicación ni recomienda precios.
- No usa modelos de lenguaje. Toda la selección es por reglas editables.
- No presenta ofertas ni interactúa con el portal más allá de lecturas públicas (API y actas de adjudicación en HTML).

## Usuarios
Tres personas del equipo. Dos roles: **Administrador** (todo, incluidas reglas y usuarios) y **Revisor** (ver, revisar, adjuntar, comentar).

## Requisitos funcionales
| Id | Requisito |
|---|---|
| RF-01 | Barrido periódico de licitaciones activas (cada 2 horas) con selección por reglas de afinidad. |
| RF-02 | Ficha completa por API para cada licitación seleccionada: organismo, unidad, región, tipo, monto, moneda, duración, fechas (publicación, fin de preguntas, respuestas, cierre, adjudicación), ítems, descripción, contrato/toma de razón. |
| RF-03 | Clasificación automática: vertical (citas y contactabilidad, activos fijos, gestión documental, calidad y acreditación, desarrollo web y plataformas, otros), tipo de comprador (hospital, servicio de salud, DAS o salud municipal, municipio, universidad o CFT, servicio público, otro), señales de incumbente detectadas en el texto. |
| RF-04 | Tablero: lista única con búsqueda por texto (código, nombre, organismo, descripción) y filtros por estado de revisión, vertical, tipo de comprador, tipo de proceso (L1, LE, LP, LQ, LR), región, rango de monto, rango de fecha de cierre, afinidad mínima, "solo nuevas", "cierra en 7 días", "sin monto publicado" y "con señales de incumbente". Orden por cierre, afinidad, monto o publicación. |
| RF-05 | Ficha de licitación: datos de la API, coincidencias que la trajeron, historial del comprador y de la vertical (adjudicaciones anteriores con ganador y precios), revisión actual y bitácora de cambios. |
| RF-06 | Revisión: estado (nueva, en revisión, viable, descartada, ofertada, adjudicada, perdida), motivos desde un catálogo fijo (varios por revisión), nota libre "por qué sí / por qué no", usuario y fecha. Toda modificación queda en la bitácora. |
| RF-07 | Adjuntos por licitación: bases, anexos, foro, actas; PDF, DOCX, XLSX, ZIP; hasta 50 MB por archivo. Descarga desde la ficha. |
| RF-08 | Histórico de adjudicaciones por vertical: comprador, nombre, fecha, número de oferentes, ganador, monto adjudicado y todos los oferentes con sus montos, obtenidos del acta pública. Filtros por vertical, proveedor, comprador, rango de fechas y búsqueda. |
| RF-09 | Reglas de afinidad editables desde la interfaz (Administrador): palabras clave por vertical con peso, exclusiones, umbral de selección, rango de montos, tipos de proceso. Con vista previa: "con estas reglas, hoy se seleccionarían N licitaciones". |
| RF-10 | Notificaciones: nueva licitación de afinidad alta; licitación viable a 5 días del cierre; fin de preguntas en 24 horas para licitaciones en revisión o viables; acta publicada de una licitación ofertada; resumen diario a las 08:00. Canal único: correo electrónico vía Resend. |
| RF-11 | Exportación del tablero filtrado y del histórico a Excel. |
| RF-12 | Usuarios y autenticación con correo y contraseña; roles; cierre de sesión por inactividad. |
| RF-13 | Bitácora de auditoría de accesos y cambios, consultable por el Administrador. |

## Requisitos no funcionales
| Id | Requisito |
|---|---|
| RN-01 | Ritmo de llamadas a la API: mínimo 3,5 s entre llamadas; reintento con espera creciente ante el código 10500; máximo 4 intentos. |
| RN-02 | Idempotencia: repetir un barrido no duplica licitaciones ni notificaciones. |
| RN-03 | Interfaz usable con teclado; búsqueda con foco al abrir el tablero; tiempos de respuesta del tablero bajo 1 s con 5.000 licitaciones. |
| RN-04 | Español neutro en toda la interfaz; fechas `dd-mm-aaaa hh:mm`; montos `$1.234.567`. |
| RN-05 | Respaldo diario de la base de datos y de los adjuntos. |
| RN-07 | El estado del worker se informa donde el equipo ya mira: el resumen diario por correo y la pantalla. Un barrido fallido no puede quedar solo en `JobRun`. |
| RN-06 | Un solo repositorio, dos procesos (web y worker) como unidades systemd, detrás de nginx con TLS. |

## Flujo de uso
1. El worker trae las activas, aplica reglas y crea las nuevas en estado **nueva** con su ficha. Avisa si la afinidad es alta.
2. Una persona abre el tablero, filtra "solo nuevas", revisa la ficha, descarga las bases desde el portal y las adjunta.
3. Marca **en revisión** mientras lee; al terminar, **viable** o **descartada**, con motivos y nota.
4. Si se oferta, pasa a **ofertada**; cuando sale el acta, el worker la detecta y la persona la cierra como **adjudicada** o **perdida**, con la nota de aprendizaje.
5. Las reglas se ajustan cuando una licitación relevante no fue seleccionada (falso negativo) o cuando llegan demasiadas irrelevantes.
