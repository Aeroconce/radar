# 17 — Alertas del pipeline y vigilancia de organismos

## Lo que faltó esta semana

| Fecha | Qué pasó | Qué debió avisar el radar |
|---|---|---|
| Lun 7, 19:00 | Alto Hospicio no publicó las respuestas comprometidas | «Respuestas vencidas sin publicar» |
| Mié 9, 16:40 | Adjudicación estimada del Sótero del Río (ofertada) | «Adjudicación estimada vencida» si no sale |
| Cualquiera | Modificación de bases con corrimiento de fechas | «Fechas cambiaron» |

Los tipos actuales (`NEW_HIGH_AFFINITY`, `CLOSING_SOON`, `QUESTIONS_CLOSING`, `AWARD_PUBLISHED`,
`DAILY_DIGEST`) cubren entrada, cierre y acta. Faltan los tres eventos intermedios, que son donde se toman
las decisiones.

## Tipos nuevos

| Tipo | Cuándo | Asunto |
|---|---|---|
| `ANSWERS_DUE` | 1 h después de `answersAt` en IN_REVIEW, VIABLE o SUBMITTED | `Revisar respuestas del foro: <nombre>` |
| `DATES_CHANGED` | Cualquier fecha de una favorita cambia entre barridos | `Fechas modificadas · <campo>: <antes> → <ahora>: <nombre>` |
| `AWARD_OVERDUE` | `awardEstimatedAt` + 1 día en SUBMITTED sin cambio de `portalStatus` | `Adjudicación estimada vencida: <nombre>` |
| `STATUS_CHANGED` | `portalStatus` cambia en SUBMITTED (6 Cerrada → 8 Adjudicada, 7 Desierta, 18 Revocada, 19 Suspendida) | `Cambio de estado · <estado>: <nombre>` |

`ANSWERS_DUE` no puede verificar si las respuestas se publicaron (los adjuntos no salen por la API); avisa
para que alguien mire. Es exactamente lo que faltó el lunes.

`STATUS_CHANGED` es la versión confiable de `AWARD_PUBLISHED`: no depende de detectar un acta, depende del
código de estado, que la API sí entrega en la ficha.

## Revisión semanal de falsos negativos

`SeenTender` ya guarda todas las activas con puntaje. Un `DAILY_DIGEST` de los lunes con dos listas:

1. **Casi entran:** puntaje entre `umbral − 2` y `umbral − 1`, no seleccionadas, ordenadas por puntaje.
2. **Coinciden con vertical nueva:** nombre que coincide con alguna regla de peso 6 pero quedó bajo el umbral
   por una exclusión. Son las candidatas a afinar la exclusión.

Diez minutos de lectura por semana; cada falso negativo real es una regla que falta, con evidencia.

**Implementado el 11-09-2026 (D-51)** como dos secciones del `DAILY_DIGEST` de los lunes (`src/lib/notifications/
digest.ts`, puro; consultas en `worker/jobs/alerts.ts`): «Casi entran» (vistas del último barrido no seleccionadas
entre umbral−2 y umbral−1, con la vertical estimada desde el nombre) y «Entraron por poco» (nuevas entre umbral y
umbral+1, con sus etiquetas estructurales), máximo 15 por sección, ordenadas por puntaje. La segunda lista no
estaba en el plan original: los falsos positivos también se buscan. La lista de «coinciden con vertical nueva» queda
pendiente. Desde D-52 (12-09-2026) «Entraron por poco» conserva el filtro de vivas del tablero, como el resto del
resumen.

## Vigilancia por organismo

La búsqueda por texto encuentra lo que se llama como uno espera. Lo que se llama distinto se encuentra por
quién compra. Tres grupos donde la muestra mostró demanda repetida:

- **Todos los SLEP.** Dos licitaciones de software de inventario en dos semanas (Tamarugal y Los
  Libertadores). Los SLEP se crean por calendario y todos tienen la misma obligación patrimonial. Son
  organismos con código propio; `Empresas/BuscarComprador` ya está en `client.ts`.
- **Hospitales para CMMS.** Con la oferta del Sótero del Río presentada y Ancud en análisis, cualquier
  hospital que publique gestión de mantenimiento es prioridad.
- **Municipios de Ñuble, Biobío y O'Higgins para módulos sueltos.** Activo fijo, reloj control, gestor
  documental, portal de pago.

```prisma
model Watchlist {
  id        String   @id @default(cuid())
  buyerCode String   @unique   // CodigoOrganismo
  nombre    String
  motivo    String             // "SLEP", "hospital CMMS", "municipio regional"
  boost     Int      @default(2)
  createdAt DateTime @default(now())
}
```

En el worker: si `Tender.buyerCode` está en `Watchlist`, `structuralScore += boost` y etiqueta con el
motivo. Una licitación de un SLEP que se llame "servicio de plataforma de gestión" entra por el organismo
aunque el nombre no diga inventario.

## Qué NO agregar

No una alerta por cada pregunta nueva en un foro ni por cada cambio de puntaje. El valor del correo está en
que cada uno exija una acción; si llegan diez al día, no se abre ninguno (`docs/08` ya lo dice y aplica
aquí igual).
