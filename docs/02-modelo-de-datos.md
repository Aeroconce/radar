# 02 — Modelo de datos

**La definición vive en [`prisma/schema.prisma`](../prisma/schema.prisma).** Este documento no la repite:
explica qué hay, por qué está así y qué invariantes hay que respetar. Cuando el schema y este texto
discrepen, manda el schema — ese compila.

## Mapa de modelos

| Modelo | Para qué |
|---|---|
| `User` | Personas del equipo. Better Auth administra la autenticación y genera además `Session`, `Account` y `Verification` con su CLI. |
| `Tender` | Licitación seleccionada, con su ficha completa de la API. Es lo que se ve en el tablero. |
| `SeenTender` | **Toda** activa vista en un barrido, entre o no al tablero. |
| `Review` | Una fila por cambio de estado o nota. La ficha muestra la última; la bitácora, todas. |
| `Attachment` | Bases, anexos, foro y actas subidos a mano (RF-07). |
| `HistoricalAward` · `HistoricalBid` | Adjudicaciones pasadas con todos sus oferentes y montos (RF-08). |
| `AffinityRule` | Palabras clave, exclusiones, patrones de comprador y señales, editables desde la interfaz (RF-09). |
| `Setting` | Umbral, rango de montos, tipos de proceso, horas de cron, destinatarios de correo. |
| `Notification` | Un aviso enviado o por enviar, con su estado y reintentos (RF-10). |
| `JobRun` | Cada ejecución del worker: inicio, fin, resultado, conteos, error. |
| `AuditLog` | Accesos y cambios, consultable por el Administrador (RF-13). |
| `Favorite` | Marcador **personal** de un perfil sobre una licitación (D-26). |

## Invariantes

Estas son las reglas que el código debe sostener; el schema solo, no las garantiza.

**El estado de una licitación vive en la última `Review`.** `Tender.reviewStatus` está desnormalizado
para poder filtrar el tablero sin un join por fila, y se actualiza **en la misma transacción** que crea
la `Review`. Si se actualizan por separado, el tablero miente.

**Nadie borra revisiones.** Una corrección es una `Review` nueva (`docs/07`). La bitácora es la memoria
de la empresa y tiene que ser completa.

**`SeenTender` se escribe siempre, `Tender` solo cuando entra.** El barrido hace `upsert` de las ~4.600
activas en `SeenTender` con su puntaje, entren o no. Sin eso no existe "la última lista de activas
guardada" que necesita la vista previa de reglas (`docs/04`) ni forma de detectar un falso negativo,
que es el ajuste del paso 5 del flujo (`docs/00`). El `cleanup` semanal purga las no vistas en 30 días.

**La idempotencia de los avisos es `Notification.dedupeKey`, no el par `(type, tenderId)`.** `tenderId`
es nulo en `DAILY_DIGEST` y PostgreSQL trata cada NULL como distinto, así que un índice sobre ese par
no impide duplicados del resumen diario y rompería RN-02. La clave se arma `<tipo>:<código>` para los
avisos por licitación y `<tipo>:<fecha>` para el resumen.

**La fila del aviso se crea antes de enviarlo.** Nace `PENDING`; el envío la pasa a `SENT` con el
`providerId` de Resend, o a `FAILED` con el error. Así `dedupeKey` reserva el aviso, un fallo queda
registrado y el ciclo siguiente lo reintenta (`docs/08`). Si la fila se creara solo al tener éxito,
un fallo no dejaría rastro.

**Una favorita es de un perfil, no del equipo.** El estado compartido ya lo lleva `Tender.reviewStatus`:
VIABLE significa que el equipo la está siguiendo. Una favorita compartida sería lo mismo. `Favorite` sirve
para otra cosa —«quiero volver a esta»— y por eso guarda el **nombre del perfil**, no un id de usuario:
la cuenta es compartida (D-22).

**La respuesta de la API se guarda íntegra en `Tender.raw`** además de los campos normalizados. Si
mañana hace falta un campo nuevo, se lee de ahí en vez de volver a consultar. Lo mismo con el texto
del acta en `HistoricalAward.raw`, por si cambia el formato del HTML.

**Todo el worker deja rastro en `JobRun`.** Cada tarea abre una fila y la cierra con `ok` o `error`.
Es lo que alimenta el estado del barrido que se informa en el resumen diario y en la pantalla (RN-07).

## Decisiones de modelado

- **Fechas en UTC** en la base; en la interfaz, hora de Chile (`America/Santiago`), formato `dd-mm-aaaa hh:mm`.
  Las de la API vienen sin zona y se interpretan como hora de Chile (`docs/03`).
- **Montos como `Decimal(16,2)`** en pesos, con la moneda registrada aparte (`CLP`, `CLF`, `USD`).
  Nunca `Float`: los montos de licitación no toleran error de redondeo.
- **`ProcessType` incluye `LS`** porque la API puede devolverlo y el modelo debe poder representarlo,
  pero el motor no lo selecciona por defecto (`docs/04`). Representar ≠ seleccionar.
- **`Tender.outOfScale`** marca las que superan el monto máximo: se listan igual, con etiqueta y −2 de
  afinidad, en vez de descartarse (`docs/04`).
- **`Attachment.checksum`** es el sha256 del contenido: detecta que el mismo archivo se subió dos veces
  y permite verificar los respaldos (`docs/10`).
- **`Review.reasons` es `String[]` de códigos**, no una relación. El catálogo es fijo y vive en el
  código (`docs/07`); una tabla de motivos añadiría un join por un dato que no cambia.
- **`HistoricalBid.result`** admite cinco valores: `Adjudicada`, `No Adjudicada`, `Rechazada`,
  `Desierta`, `Inadmisible` — los mismos que acepta la expresión regular del acta en `docs/03`.

## Semilla

`docs/11` detalla la carga. En resumen: `Tender` desde `seed/licitaciones_detalle.json`;
`HistoricalAward` y `HistoricalBid` desde `seed/adjudicaciones_historicas.json` más
`seed/actas_oferentes.json`; la lista de organismos para clasificar compradores desde
`seed/organismos_compradores.json`.
