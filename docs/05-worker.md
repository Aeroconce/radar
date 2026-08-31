# 05 — Worker y tareas programadas

Proceso separado (`pnpm worker`), mismo repositorio, mismo `DATABASE_URL`. Cada tarea abre un `JobRun`, registra conteos y cierra con `ok`/`error`. Si una tarea sigue corriendo cuando toca la siguiente del mismo tipo, la nueva se omite (bloqueo por `JobRun` abierto con menos de 2 horas).

| Tarea | Cron (hora de Chile) | Qué hace |
|---|---|---|
| `sweep` (RF-01, RF-02, RF-03) | cada 2 horas, minuto 15 | 1) `getActive()`; hacer `upsert` de **todas** en `SeenTender` con su puntaje, entren o no (es la base de la vista previa de reglas y de la detección de falsos negativos). 2) Para cada código no existente en `Tender`: calcular afinidad con el nombre; si ≥ umbral − 1, pedir ficha, recalcular con descripción; si ≥ umbral, crear `Tender` (NEW) con clasificación y coincidencias. 3) Para los existentes en estado NEW/IN_REVIEW/VIABLE/SUBMITTED cuya `FechaCierre` del listado cambió, refrescar la ficha. 4) Marcar `portalStatus` de los que ya no están activos. 5) Disparar `NEW_HIGH_AFFINITY` para las nuevas con afinidad ≥ umbral alto (Setting, inicial 8). 6) Marcar `SeenTender.selected` en las que entraron. |
| `history` (RF-05) | diario 04:00 | `getAwardedOn(ayer)`; para las coincidentes con las reglas (mismo motor, umbral 3): ficha, acta y parseo; crear `HistoricalAward` y `HistoricalBid`. Ejecución manual con rango de fechas: `pnpm worker:historico -- 2026-08-01 2026-08-31`. |
| `awards` | diario 06:00 | Para `Tender` en SUBMITTED, VIABLE o IN_REVIEW con `awardEstimatedAt` ≤ hoy + 15 días: pedir ficha; si trae `Adjudicacion.UrlActa`, parsear el acta, guardar en el histórico y disparar `AWARD_PUBLISHED`. |
| `alerts` (RF-10) | diario 08:00 | `CLOSING_SOON`: VIABLE o IN_REVIEW con cierre en ≤ 5 días. `QUESTIONS_CLOSING`: IN_REVIEW o VIABLE con fin de preguntas en ≤ 24 h. `DAILY_DIGEST`: resumen con nuevas del día, en revisión, viables y cierres de la semana. |
| `cleanup` | semanal, domingo 03:00 | Archivar `JobRun` de más de 90 días; purgar `SeenTender` no vistas en 30 días; verificar archivos huérfanos en `storage/`. |

## Cuando se pide la ficha

El listado de activas trae ~4.700 registros con solo el nombre; la ficha cuesta una llamada cada una.
Se pide en dos casos y en ninguno mas:

1. El codigo **no esta** en `Tender` y el puntaje del nombre quedo a un punto del umbral (`docs/04`).
2. El codigo **si esta** en `Tender` y la fecha de cierre del listado cambio, o sea hubo prorroga.

Pedirla en cada ciclo para todo lo que ronda el umbral costaba **198 llamadas y unos 12 minutos** por
barrido, medido contra la API el 2026-08-30. Con la regla de arriba el estado estable son las 5 a 40
que `docs/03` da por normales; el primer barrido si es caro, porque no hay nada conocido.

Las que ya no aparecen entre las activas y siguen en un estado abierto se refrescan con un tope de
**40 por ciclo**, para no vaciar la cuota si un dia salen muchas juntas. Lo que no alcanza queda en
`counters.deferred` y se registra en el log: el recorte nunca es silencioso.

Reglas:
- El cliente de la API impone el ritmo (RN-01). Un barrido con 30 fichas nuevas tarda ~2 minutos; es normal.
- Idempotencia (RN-02): `Tender.code` único; `Notification` única por `dedupeKey` (`<tipo>:<código>` o `<tipo>:<fecha>` para el resumen); el histórico usa `HistoricalAward.code` único.
- Errores de una ficha no detienen el barrido: se registra en `counters.failed[]` y se reintenta en el próximo ciclo.
- Todo se puede ejecutar a mano con `worker/run.ts <sweep|history|awards|alerts>` para depurar.
- Registro con pino en JSON; sin el ticket en los logs (`redact` en `src/lib/logger.ts`).
- Los cron llevan `timezone: 'America/Santiago'` explicito. Sin eso `node-cron` corre en UTC y el resumen
  de las 08:00 se correria una hora medio ano, porque Chile cambia de huso.
