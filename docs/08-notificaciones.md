# 08 — Notificaciones (RF-10)

Canal único: **correo electrónico vía Resend**. No hay otros canales.

- Dominio `radar.aeroconce.cl`, verificado en Resend, región `sa-east-1`.
- Remitente en `RESEND_FROM` (por defecto `Radar de Licitaciones <notificaciones@radar.aeroconce.cl>`).
- Destinatarios en `NOTIFY_TO` (lista separada por coma), ajustables desde Configuración.
- El dominio tiene **recepción deshabilitada**: nadie lee lo que llegue a esa casilla. Por eso todo correo
  lleva `Reply-To` a `RESEND_REPLY_TO`, una casilla real; sin eso, responder un aviso sería escribirle al vacío.

Asuntos y cuerpos en español neutro. Cada correo lleva enlace directo a la ficha.

El asunto abre con el **plazo**, no con una etiqueta genérica: es lo único que se lee en la bandeja sin
abrir el correo, y es lo que decide si se abre. «Cierra en 3 días · Sistema de gestión documental» sirve;
«Nueva licitación afín», no.

| Tipo | Cuándo | Asunto |
|---|---|---|
| NEW_HIGH_AFFINITY | Al crear una licitación con afinidad ≥ umbral alto | `Nueva licitación afín: <nombre>` |
| CLOSING_SOON | 08:00, VIABLE o IN_REVIEW con cierre en ≤ 5 días | `Cierra en <n> días: <nombre>` |
| QUESTIONS_CLOSING | 08:00, IN_REVIEW o VIABLE con fin de preguntas en ≤ 24 h | `Preguntas cierran mañana: <nombre>` |
| AWARD_PUBLISHED | Al detectar acta de una SUBMITTED | `Acta publicada: <nombre>` |
| DAILY_DIGEST | 08:00 | `Radar — resumen del <fecha>` |

## Qué lleva el cuerpo

Un aviso tiene que responder tres preguntas **antes** de que la persona decida abrir la ficha:

1. **De qué se trata.** Nombre, organismo, región, tipo de proceso, monto, código, y un extracto de la
   descripción real de las bases. Un nombre suelto no basta: «SISTEMA DE GESTIÓN DOCUMENTAL» no dice si es
   un desarrollo, un arriendo o una digitalización.
2. **Cuánto tiempo queda.** Una etiqueta con el plazo, con los colores de `docs/06`: rojo bajo 2 días,
   ámbar bajo 5, gris el resto.
3. **Por qué lo trajo el radar.** La afinidad **contra su umbral** — un «16» suelto no significa nada,
   «16 de un umbral de 8» sí — y los términos que coincidieron. Si hay señales de proveedor instalado,
   se advierten aparte: es lo que cambia cómo se leen las bases.

Dos enlaces: la ficha del radar y el portal de Mercado Público, porque las bases se descargan de ahí.

El resumen diario muestra los tres conteos como cifras grandes y una tabla de cierres de la semana con
su urgencia; su asunto trae los números, para poder leerlo sin abrirlo.

**Restricciones del formato.** Estilos en línea y tablas para la maqueta: los clientes de correo ignoran
las hojas de estilo y buena parte de CSS moderno. Sin imágenes ni fuentes externas, que cargan mal, se
bloquean y delatan al lector. Los nombres vienen del portal, así que se escapan.

## Reglas

- Una notificación por tipo y licitación (`@@unique`); activación por tipo desde Configuración.
- El envío fallido se registra con el `id` de Resend o el error, y se reintenta en el ciclo siguiente.
- Nunca se incluyen credenciales ni datos personales en el mensaje.
- Los cuatro tipos por evento se **agrupan en un solo correo por ciclo del worker** cuando caen juntos,
  para no llenar la bandeja. El resumen diario siempre va aparte.
- El límite del plan de Resend se respeta desde el worker; si se agota, el envío queda pendiente y se reintenta.

## Ciclo de vida de un aviso

1. El barrido decide avisar y crea la fila **`PENDING`**. `dedupeKey` reserva el aviso: aunque el ciclo se
   repita, no habrá un segundo correo por la misma licitación.
2. Al **cerrar** el ciclo, no al encolar, se despacha la cola. Si el barrido falla a mitad, no queda un
   correo anunciando algo que no se guardó.
3. El envío la pasa a **`SENT`** con el `providerId` de Resend, o a **`FAILED`** con el error.
4. El ciclo siguiente reintenta las `FAILED`. Tras **4 intentos** se deja de insistir: queda `FAILED` con su
   error, visible en Configuración, en vez de repetirse cada dos horas para siempre.

## Implementación

- `src/lib/notifications/email.ts` — arma y entrega. Las cinco plantillas, en HTML simple con alternativa
  en texto plano, sin imágenes ni fuentes externas. Escapa los nombres, que vienen del portal.
- `src/lib/notifications/dispatch.ts` — decide qué se envía y lleva la cuenta de los intentos. Separado a
  propósito: una cosa es armar un correo y otra decidir que salga.
