# 11 — Pruebas y semilla

## Semilla (`pnpm seed`)
Carga los datos reales de la carpeta `seed/`:
- `licitaciones_detalle.json`: 87 fichas completas de la API (40 candidatas activas del barrido del 27-08-2026 y 45 históricas), tal como las devuelve la API. Se insertan en `Tender` (las activas) y sirven de fixture para el parser de fichas.
- `candidatas_2026-08-27.json`: las 40 candidatas con su puntaje y coincidencias de la versión Python del motor; sirven para comparar la salida del motor en TypeScript (deben coincidir en selección; los puntajes pueden diferir por las reglas nuevas).
- `adjudicaciones_historicas.json` + `actas_oferentes.json`: 45 adjudicaciones de las ventanas sept–nov 2024 y 2025 con todos sus oferentes, montos y resultados → `HistoricalAward` y `HistoricalBid`.
- `adjudicadas_coincidencias_2024_2025.json`: 356 coincidencias del barrido histórico (código, nombre, fecha) para pruebas del clasificador de verticales.
- `organismos_compradores.json`: 899 organismos (`CodigoEmpresa`, `NombreEmpresa`) para la clasificación de compradores.
- Crea el usuario administrador inicial con la contraseña indicada en `SEED_ADMIN_PASSWORD` y las reglas iniciales de `docs/04`.

- `revisiones.json`: las **36 revisiones** que el equipo ya hizo, capturadas el 2026-08-31, con su estado,
  motivos del catálogo de `docs/07` y la nota de por qué sí o por qué no. Dos ofertadas, una perdida, una
  en revisión, dos viables y treinta descartadas.

  Muchas no aparecen en el último barrido, así que la semilla **pide sus fichas a la API** al cargarlas
  (21 de las 36 la primera vez, alrededor de un minuto). Es idempotente por la nota: la segunda corrida no
  duplica nada ni vuelve a llamar.

  El archivo trae además tres secciones que **no se cargan** y quedan a la vista para completar: ocho códigos
  de reventa de licencias sin el sufijo de tipo y año, siete organismos de baja prioridad sin código, y cinco
  códigos que **no son nuestros** — son referencias de experiencia de competidores, anotadas para que nadie
  los cargue por error.

La semilla es **idempotente**: correrla dos veces no duplica nada. Las reglas de afinidad se reemplazan
enteras en cada corrida (se identifican por `updatedBy = "seed"`), porque son la versión de `docs/04`
y no un acumulado.

## Pruebas unitarias (vitest)
**Ya escritas** (108 pruebas):
- `affinity.test.ts`: los 13 casos obligatorios de `docs/04`, normalización de tildes, conservación de
  posiciones al recortar coincidencias, peso una vez por regla, exclusiones, monto fuera de escala,
  exclusión de `LS`, vertical, tipo de comprador y señales de incumbente.
- `affinity.test.ts` incluye además la **muestra de septiembre de 2026**: los 20 casos de `docs/19` viven en
  `tests/fixtures/casos-septiembre-2026.ts` con su resultado esperado (entra / no entra / entra bajo / al borde) y
  su vertical. Cada licitación revisada a mano que sorprenda al radar se agrega ahí **antes** de tocar una regla.
- `baseline.test.ts`: comparación contra `seed/candidatas_2026-08-27.json`. Las diferencias conocidas están
  declaradas con su razón; si aparece una nueva, o si una declarada deja de serlo, la prueba falla.

- `parsers.test.ts`: ficha de la API → `Tender`. Zona horaria a ambos lados del cambio de horario, ida y
  vuelta de cuatro fechas del año, unidades de duración, tipos de proceso desconocidos, montos en cero y
  ficha vacía.
- `client.test.ts`: ritmo de 3,5 s, espera solo la diferencia, serialización de llamadas concurrentes,
  cuatro reintentos con esperas crecientes ante el código 10500, `Upstream` sin reintento, ticket en la URL.
  Reloj, `sleep` y `fetch` inyectados: sin llamadas reales y sin esperas reales.

**Pendientes**:
- `classify.test.ts`: vertical para las 356 coincidencias históricas (muestra verificada a mano).
- `notifications.test.ts`: idempotencia por `dedupeKey` y registro de fallos.
- Integración del barrido contra una base vacía con la lista de activas como fixture.
- `parsers.test.ts`: ficha de la API → `Tender` (fechas, duración, moneda, nulos); acta HTML → oferentes (fixture guardada de un acta real, con montos unitarios y totales).
- `client.test.ts`: cola con intervalo mínimo; reintento ante 10500 con esperas crecientes; sin llamadas reales (mock).
- `notifications.test.ts`: idempotencia por tipo y licitación.

## Pruebas de integración
- `sweep` contra una base vacía con la lista de activas guardada como fixture: crea exactamente las candidatas esperadas, sin duplicados al repetir.
- Server Actions de revisión: transición de estados, validación de motivos y nota, actualización de `Tender.reviewStatus`, fila en `AuditLog`.

## Prueba manual antes de publicar
Iniciar sesión y elegir perfil · buscar "whatsapp" y "gestión documental" · filtrar Nuevas + cierre en 7 días · abrir una ficha y marcarla Descartada · verificar la bitácora · ejecutar "barrido ahora" y revisar `JobRun` · exportar el tablero a Excel · comprobar que el resumen diario informe el estado del último barrido.
