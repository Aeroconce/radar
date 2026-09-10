# 18 — Plan de implementación

Orden por impacto sobre esfuerzo. Cada fase deja el radar funcionando y medible; ninguna depende de la
siguiente.

## Fase 1 — Reglas de texto y fixtures (una tarde)

1. Agregar los 20 casos de `19-casos-de-prueba.md` a `tests/affinity.test.ts` como fixture con resultado
   esperado (`entra` / `no entra` / `vertical`). Correr: hoy deben fallar 13.
2. Aplicar D-35, D-36, D-38, D-39 en `initial-rules.ts`. Correr: deben quedar fallando solo UFRO, Bulnes y
   Peñalolén (las que necesitan la fase 2).
3. D-37: migración Prisma con las tres verticales, regenerar el cliente, agregar las reglas.
4. D-40: `OPPORTUNITY_SIGNAL` en `rules.ts`, `rule-kinds.ts`, `classify.ts` y `Tender.opportunitySignals`.
5. `pnpm prisma db seed` y «Recalcular el tablero».

Criterio de salida: las cinco viables con vertical correcta; las trampas de texto bajo el umbral.

## Fase 2 — Señales estructurales (un día)

1. `Tender.textScore`, `Tender.structuralScore`, `Tender.structuralTags`.
2. `computeStructural()` en `src/lib/affinity/structural.ts` con pruebas sobre los mismos 20 casos (monto,
   duración, tipo e ítems están en `19-casos-de-prueba.md`).
3. Llamarla en el worker tras la ficha y en «Recalcular el tablero».
4. `Setting`: `canonMin`, `canonMax`, `lrPenalty`, `noSoftwareItemPenalty`, editables desde `reglas/`.
5. Etiquetas en el tablero junto a las de incumbente.

Criterio de salida: la tabla "después" del docs/13 reproducida por las pruebas.

## Fase 3 — Revisión estructurada (un día)

1. Modelo `Viabilidad` y enums (docs/16), migración.
2. Bloque en `review-form.tsx` y acción de guardado en `licitaciones/[code]/actions.ts`.
3. Semáforo derivado en `tender-table.tsx`.
4. Códigos nuevos en el catálogo de `docs/07` y en `reviews.ts`.
5. Cargar a mano las 20 de la muestra: es el dataset inicial y la prueba de que el formulario sirve.

Criterio de salida: ninguna VIABLE con campos en DESCONOCIDO.

## Fase 4 — Alertas y vigilancia (medio día)

1. `ANSWERS_DUE`, `DATES_CHANGED`, `AWARD_OVERDUE`, `STATUS_CHANGED` en `notifications/dispatch.ts` y en
   el worker (comparación de fechas y `portalStatus` entre barridos).
2. Digest de los lunes con los dos listados de falsos negativos.
3. `Watchlist` con los SLEP existentes cargados por semilla.

## Medición

Precisión no se mejora sin medirla. Dos números por semana, calculados desde la base:

- **Precisión** = licitaciones marcadas VIABLE o SUBMITTED ÷ licitaciones que entraron al tablero esa
  semana. Hoy ~26% en la muestra. Meta a un mes: 50%. A tres meses: 70%.
- **Recall aparente** = falsos negativos encontrados en el digest ÷ (viables + falsos negativos). Meta:
  mantener sobre 90% mientras sube la precisión; si baja, alguna exclusión nueva está botando de más.

Y una tercera cuando haya datos: de las que se marcaron VIABLE, cuántas resultaron rojas en la revisión
estructurada. Si es alta, el texto sigue dejando pasar patrones que el docs/16 puede convertir en reglas.

## Riesgos

- **Sobre-exclusión.** `difusion`, `seguro` y `turnos` están acotadas con contexto a propósito. Si el digest
  de falsos negativos muestra una viable botada por ellas, se afina, no se elimina.
- **Datos de ficha incompletos.** `estimatedAmount` viene vacío a veces (Sótero del Río, Aconcagua). Sin
  monto no hay canon: la señal se omite, no penaliza.
- **Recalcular no borra.** Como dice `docs/04`, bajar del umbral no saca del tablero lo ya revisado. Correcto;
  las 13 trampas de septiembre siguen visibles con su puntaje nuevo como evidencia.

## Qué no hacer

No subir el umbral para "compensar". Con umbral 4, la ofertada del Sótero del Río nunca habría entrado. La
precisión se gana con exclusiones y señales, no cerrando la puerta.
