/**
 * Envio de notificaciones por correo (docs/08, RF-10).
 *
 * Canal unico: Resend. El dominio `radar.aeroconce.cl` esta verificado pero con la
 * recepcion deshabilitada, asi que cada correo lleva `Reply-To` a una casilla real;
 * sin eso, responder un aviso seria escribirle al vacio.
 *
 * ## Direccion de diseno
 *
 * Esto es un **aviso institucional**, no una pieza de marketing: se parece mas a
 * una notificacion oficial que a un boletin. Todo el contenido va dentro de una
 * tarjeta con borde, con una banda de cabecera que ancla el aviso y zonas separadas
 * por reglas. Antes flotaba todo al mismo nivel sobre blanco y se leia desordenado.
 *
 * Todo en sans, con el contraste dado por escala y peso en vez de mezclar familias:
 * los nombres llegan en caja alta desde el portal y una serif en negrita se lee
 * como un grito.
 *
 * ## Restricciones del formato
 *
 * Estilos en linea y tablas para la maqueta: los clientes de correo ignoran las
 * hojas de estilo y no admiten flexbox ni grid. Sin imagenes ni fuentes externas,
 * que cargan mal, se bloquean y delatan al lector. Sin animaciones.
 *
 * Este modulo solo arma y entrega. Quien decide que enviar y registra el resultado
 * es `dispatch.ts`.
 */
import { Resend } from "resend";
import { env, notifyRecipients } from "@/lib/env";
import type { NotificationType } from "@/generated/prisma/enums";

let client: Resend | null = null;

function resend(): Resend {
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  /** Id del envio en Resend, para poder rastrearlo despues. */
  providerId?: string;
  error?: string;
}

// ------------------------------------------------------------------ formato

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const longDate = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "long" });
const shortDate = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
});

export const formatAmount = (n: number | null | undefined) =>
  typeof n === "number" ? money.format(n) : "no publicado";

export const formatDate = (d: Date | string | null | undefined) => {
  if (!d) return "sin fecha";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "sin fecha" : longDate.format(date);
};

/** Version corta para la franja de cifras, donde el espacio es poco. */
export const formatDateShort = (d: Date | string | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : shortDate.format(date).replace(".", "");
};

/** Dias completos que faltan para una fecha. Negativo si ya paso. */
export function daysUntil(d: Date | string | null | undefined, from = new Date()): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - from.getTime()) / 86_400_000);
}

const BASE = env.BETTER_AUTH_URL.replace(/\/$/, "");
export const tenderUrl = (code: string) => `${BASE}/licitaciones/${encodeURIComponent(code)}`;
export const portalUrl = (code: string) =>
  `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(code)}`;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Corta en el ultimo espacio antes del limite, para no partir una palabra. */
export function truncate(text: string, max = 300): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")) || cut}…`;
}

// -------------------------------------------------------------------- estilo

const NAVY = "#1c2f4a";
const INK = "#111827";
const BODY = "#374151";
const MUTED = "#6b7280";
const FAINT = "#9ca3af";
const RULE = "#e5e7eb";
const SOFT = "#f9fafb";

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
/**
 * Titular en Helvetica Neue con respaldo a la sans del sistema.
 *
 * Nada de serif: los nombres llegan en caja alta desde el portal, y una serif
 * en negrita y mayusculas se lee como un grito. La caja alta ademas necesita
 * algo de espaciado entre letras, que en cuerpo normal sobraria.
 */
const TITLE = "'Helvetica Neue',Helvetica,'Segoe UI',Arial,sans-serif";

/** Color del plazo: rojo bajo 2 dias, ambar bajo 5, neutro el resto (docs/06). */
function urgency(days: number | null): { fg: string; bg: string; label: string } {
  if (days === null) return { fg: "#e5e7eb", bg: "rgba(255,255,255,.12)", label: "sin fecha de cierre" };
  if (days < 0) return { fg: "#fecaca", bg: "rgba(239,68,68,.22)", label: "cerrada" };
  if (days === 0) return { fg: "#fecaca", bg: "rgba(239,68,68,.22)", label: "cierra hoy" };
  if (days <= 2)
    return { fg: "#fecaca", bg: "rgba(239,68,68,.22)", label: `cierra en ${days} día${days === 1 ? "" : "s"}` };
  if (days <= 5) return { fg: "#fde68a", bg: "rgba(245,158,11,.22)", label: `cierra en ${days} días` };
  return { fg: "#d1d5db", bg: "rgba(255,255,255,.12)", label: `cierra en ${days} días` };
}

/** Encabezado de seccion: texto corto en versalitas con una regla que lo ancla. */
function section(label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 12px">
    <tr>
      <td style="padding:0 10px 0 0;white-space:nowrap;font-family:${SANS};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${FAINT};font-weight:700">${escape(label)}</td>
      <td style="width:100%;border-bottom:1px solid ${RULE};font-size:0;line-height:0">&nbsp;</td>
    </tr>
  </table>`;
}

/**
 * Franja de cifras clave. Las tres que deciden si vale la pena mirar la ficha,
 * juntas y comparables, en vez de perdidas dentro de una lista de etiquetas.
 */
function figures(cells: Array<{ label: string; value: string; accent?: string }>): string {
  const tds = cells
    .map(
      (c, i) =>
        `<td style="padding:14px 16px;width:${Math.floor(100 / cells.length)}%;vertical-align:top;${i > 0 ? `border-left:1px solid ${RULE};` : ""}">
          <div style="font-family:${SANS};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${FAINT};font-weight:700;margin:0 0 5px">${escape(c.label)}</div>
          <div style="font-family:${SANS};font-size:15px;font-weight:600;color:${c.accent ?? INK};line-height:1.3">${escape(c.value)}</div>
        </td>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid ${RULE};background:${SOFT}">
    <tr>${tds}</tr>
  </table>`;
}

/** Pares etiqueta-valor con la columna de etiquetas fija y angosta. */
function facts(pairs: Array<[string, string]>): string {
  const rows = pairs
    .filter(([, v]) => v && v !== "—")
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:5px 14px 5px 0;font-family:${SANS};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;width:1%">${escape(k)}</td>
          <td style="padding:5px 0;font-family:${SANS};font-size:14px;color:${BODY};vertical-align:top">${escape(v)}</td>
        </tr>`,
    )
    .join("");
  return rows
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>`
    : "";
}

function chips(terms: string[]): string {
  if (terms.length === 0) return "";
  return terms
    .slice(0, 6)
    .map(
      (t) =>
        `<span style="display:inline-block;padding:4px 9px;margin:0 5px 5px 0;border:1px solid ${RULE};border-radius:3px;background:#ffffff;font-family:${SANS};font-size:11px;color:${BODY};letter-spacing:.02em">${escape(t)}</span>`,
    )
    .join("");
}

/** Dos botones de verdad: el secundario con borde, si no no parece pulsable. */
function buttons(a: { href: string; label: string }, b?: { href: string; label: string }): string {
  const primary = `<a href="${escape(a.href)}" style="display:inline-block;background:${NAVY};color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:600">${escape(a.label)}</a>`;
  const secondary = b
    ? `<a href="${escape(b.href)}" style="display:inline-block;border:1px solid ${RULE};color:${BODY};padding:11px 20px;border-radius:4px;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:600;margin-left:8px">${escape(b.label)}</a>`
    : "";
  return `<div style="margin:26px 0 0">${primary}${secondary}</div>`;
}

/**
 * Tarjeta con banda de cabecera y pie. El borde es lo que le da orden al aviso:
 * sin el, las zonas quedan flotando sobre blanco y se leen como fragmentos sueltos.
 */
function layout(opts: { badge: string; badgeFg: string; badgeBg: string; body: string; footer: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#eef0f3">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #d7dbe0;border-radius:6px;overflow:hidden">

      <tr><td style="padding:14px 28px;background:${NAVY}">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-family:${SANS};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#ffffff;font-weight:700">Radar de Licitaciones</td>
            <td align="right" style="white-space:nowrap">
              <span style="display:inline-block;padding:4px 11px;border-radius:999px;background:${opts.badgeBg};color:${opts.badgeFg};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:.02em">${escape(opts.badge)}</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="padding:28px">${opts.body}</td></tr>

      <tr><td style="padding:14px 28px;background:${SOFT};border-top:1px solid ${RULE}">
        <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.6;color:${FAINT}">${escape(opts.footer)}</p>
      </td></tr>

    </table>
  </td></tr>
</table>`;
}

/** Titulo de la licitacion con su codigo debajo, no perdido en la tabla de datos. */
function heading(title: string, subtitle: string): string {
  return `<h1 style="margin:0;font-family:${TITLE};font-size:20px;line-height:1.35;font-weight:600;letter-spacing:.012em;color:${INK}">${escape(title)}</h1>
    ${subtitle ? `<p style="margin:8px 0 0;font-family:${SANS};font-size:12px;color:${FAINT};letter-spacing:.03em">${escape(subtitle)}</p>` : ""}`;
}

const plain = (title: string, lines: string[], links: string[] = []) =>
  ["RADAR DE LICITACIONES", "", title, "", ...lines.filter(Boolean), ...(links.length ? ["", ...links] : [])].join("\n");

// ------------------------------------------------------------------ payload

/** Datos que cada tipo de aviso necesita para armarse. */
export interface NoticePayload {
  code?: string;
  name?: string;
  description?: string;
  organism?: string;
  unit?: string;
  region?: string;
  processType?: string;
  closesAt?: string | null;
  questionsUntil?: string | null;
  amount?: number | null;
  currency?: string;
  score?: number;
  threshold?: number;
  matchedTerms?: string[];
  incumbentSignals?: string[];
  opportunitySignals?: string[];
  outOfScale?: boolean;
  status?: string;
  days?: number;
  winner?: string;
  awarded?: number | null;
  counts?: { nuevas?: number; enRevision?: number; viables?: number };
  closingThisWeek?: Array<{ code: string; name: string; closesAt: string | null }>;
  /** Estado del ultimo barrido (RN-07): el resumen es donde el equipo se entera de un fallo. */
  sweep?: { finishedAt: string | null; ok: boolean | null };
}

/** Tramo de cada tipo de proceso, para no mostrar la sigla cruda (docs/06). */
const PROCESS_LABEL: Record<string, string> = {
  L1: "L1, menor a 100 UTM",
  LE: "LE, entre 100 y 1.000 UTM",
  LP: "LP, entre 1.000 y 5.000 UTM",
  LQ: "LQ, entre 5.000 y 10.000 UTM",
  LR: "LR, sobre 10.000 UTM",
  LS: "LS, servicios personales",
};

// ---------------------------------------------------------------- plantillas

/**
 * Arma el correo de un aviso. Un tipo desconocido devuelve `null` en vez de enviar
 * algo a medias: es preferible dejarlo registrado como fallo y revisarlo.
 */
export function renderNotice(type: NotificationType, p: NoticePayload): EmailContent | null {
  const name = p.name ?? "Licitación sin nombre";
  const link = p.code ? tenderUrl(p.code) : BASE;
  const portal = p.code ? portalUrl(p.code) : null;
  const days = p.days ?? daysUntil(p.closesAt);
  const u = urgency(days);
  const capitalized = u.label.charAt(0).toUpperCase() + u.label.slice(1);

  const proceso = p.processType ? (PROCESS_LABEL[p.processType] ?? p.processType) : "";
  const subtitle = [p.code, proceso].filter(Boolean).join("  ·  ");

  /** Quien compra: organismo destacado, unidad y region debajo. */
  const buyer = p.organism
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:20px 0 0">
        <tr><td style="padding:16px 0;border-top:1px solid ${RULE};border-bottom:1px solid ${RULE}">
          <div style="font-family:${SANS};font-size:15px;font-weight:600;color:${INK};line-height:1.4">${escape(p.organism)}</div>
          ${
            p.unit || p.region
              ? `<div style="font-family:${SANS};font-size:13px;color:${MUTED};margin:4px 0 0">${escape([p.unit, p.region].filter(Boolean).join("  ·  "))}</div>`
              : ""
          }
        </td></tr>
      </table>`
    : "";

  switch (type) {
    case "NEW_HIGH_AFFINITY": {
      const cifras = figures([
        { label: "Cierre", value: formatDateShort(p.closesAt), accent: days !== null && days <= 5 ? "#b91c1c" : undefined },
        { label: "Preguntas hasta", value: formatDateShort(p.questionsUntil) },
        { label: "Monto estimado", value: formatAmount(p.amount) },
      ]);

      const descripcion = p.description
        ? `<div style="margin:22px 0 0;padding:15px 17px;background:${SOFT};border:1px solid ${RULE};border-radius:4px;font-family:${SANS};font-size:13.5px;line-height:1.65;color:${BODY}">${escape(truncate(p.description))}</div>`
        : "";

      const porque =
        p.score === undefined
          ? ""
          : `<div style="margin:28px 0 0">${section("Por qué apareció")}
              <p style="margin:0 0 ${(p.matchedTerms ?? []).length ? "10px" : "0"};font-family:${SANS};font-size:14px;color:${BODY}">
                Afinidad <strong style="color:${INK}">${p.score}</strong>${p.threshold ? ` de un umbral de ${p.threshold}` : ""}.
              </p>
              ${chips(p.matchedTerms ?? [])}
            </div>`;

      const senales = (p.incumbentSignals ?? []).length
        ? `<div style="margin:20px 0 0;padding:13px 16px;background:#fffbeb;border-left:3px solid #d97706;border-radius:0 4px 4px 0">
            <div style="font-family:${SANS};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;font-weight:700;margin:0 0 4px">Posible proveedor instalado</div>
            <div style="font-family:${SANS};font-size:13px;color:#78350f;line-height:1.55">Las bases mencionan ${escape((p.incumbentSignals ?? []).join(", "))}. Léelas con eso en mente.</div>
          </div>`
        : "";

      const oportunidad = (p.opportunitySignals ?? []).length
        ? `<div style="margin:20px 0 0;padding:13px 16px;background:#ecfdf5;border-left:3px solid #059669;border-radius:0 4px 4px 0">
            <div style="font-family:${SANS};font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#065f46;font-weight:700;margin:0 0 4px">Señal de oportunidad</div>
            <div style="font-family:${SANS};font-size:13px;color:#064e3b;line-height:1.55">Las bases mencionan ${escape((p.opportunitySignals ?? []).join(", "))}. Un relanzamiento o una reserva para empresas de menor tamaño cambian la competencia.</div>
          </div>`
        : "";

      const escala = p.outOfScale
        ? `<p style="margin:14px 0 0;font-family:${SANS};font-size:13px;color:${MUTED}">Supera el monto máximo configurado: se lista igual, con menos afinidad.</p>`
        : "";

      return {
        subject: `${capitalized} · ${name}`,
        html: layout({
          badge: u.label,
          badgeFg: u.fg,
          badgeBg: u.bg,
          body:
            heading(name, subtitle) +
            buyer +
            `<div style="margin:20px 0 0">${cifras}</div>` +
            descripcion +
            porque +
            senales +
            oportunidad +
            escala +
            buttons({ href: link, label: "Ver ficha" }, portal ? { href: portal, label: "Mercado Público" } : undefined),
          footer:
            "Las bases se descargan del portal y se adjuntan a la ficha. Puedes desactivar este aviso en Configuración.",
        }),
        text: plain(
          name,
          [
            capitalized.toUpperCase(),
            subtitle,
            "",
            p.organism ?? "",
            [p.unit, p.region].filter(Boolean).join(" · "),
            "",
            `Cierre: ${formatDate(p.closesAt)}`,
            `Preguntas hasta: ${formatDate(p.questionsUntil)}`,
            `Monto estimado: ${formatAmount(p.amount)}`,
            "",
            p.description ? truncate(p.description) : "",
            "",
            `Afinidad ${p.score ?? "-"}${p.threshold ? ` de un umbral de ${p.threshold}` : ""}`,
            (p.matchedTerms ?? []).length ? `Coincidencias: ${(p.matchedTerms ?? []).join(", ")}` : "",
            (p.incumbentSignals ?? []).length
              ? `Posible proveedor instalado: ${(p.incumbentSignals ?? []).join(", ")}`
              : "",
            (p.opportunitySignals ?? []).length
              ? `Señal de oportunidad: ${(p.opportunitySignals ?? []).join(", ")}`
              : "",
          ],
          [`Ver ficha: ${link}`, ...(portal ? [`Mercado Público: ${portal}`] : [])],
        ),
      };
    }

    case "CLOSING_SOON":
      return {
        subject: `${capitalized} · ${name}`,
        html: layout({
          badge: u.label,
          badgeFg: u.fg,
          badgeBg: u.bg,
          body:
            heading(name, subtitle) +
            buyer +
            `<div style="margin:20px 0 0">${figures([
              { label: "Cierre", value: formatDateShort(p.closesAt), accent: "#b91c1c" },
              { label: "Estado", value: p.status ?? "—" },
            ])}</div>` +
            `<p style="margin:22px 0 0;font-family:${SANS};font-size:14px;color:${BODY}">Está marcada como viable o en revisión y el plazo se acaba.</p>` +
            buttons({ href: link, label: "Ver ficha" }, portal ? { href: portal, label: "Mercado Público" } : undefined),
          footer: "Aviso automático de licitaciones viables o en revisión.",
        }),
        text: plain(
          name,
          [capitalized.toUpperCase(), `Estado: ${p.status ?? "sin estado"}`, `Cierre: ${formatDate(p.closesAt)}`],
          [`Ver ficha: ${link}`],
        ),
      };

    case "QUESTIONS_CLOSING":
      return {
        subject: `Últimas horas para preguntar · ${name}`,
        html: layout({
          badge: "preguntas cierran en 24 h",
          badgeFg: "#fde68a",
          badgeBg: "rgba(245,158,11,.22)",
          body:
            heading(name, subtitle) +
            buyer +
            `<div style="margin:20px 0 0">${figures([
              { label: "Preguntas hasta", value: formatDateShort(p.questionsUntil), accent: "#b45309" },
              { label: "Cierre", value: formatDateShort(p.closesAt) },
              { label: "Estado", value: p.status ?? "—" },
            ])}</div>` +
            `<p style="margin:22px 0 0;font-family:${SANS};font-size:14px;color:${BODY}">Después de este plazo no se pueden hacer consultas al comprador.</p>` +
            buttons({ href: link, label: "Ver ficha" }, portal ? { href: portal, label: "Ir al foro" } : undefined),
          footer: "Aviso automático.",
        }),
        text: plain(
          name,
          ["LAS PREGUNTAS CIERRAN EN 24 HORAS", `Preguntas hasta: ${formatDate(p.questionsUntil)}`],
          [`Ver ficha: ${link}`],
        ),
      };

    case "AWARD_PUBLISHED":
      return {
        subject: `Se adjudicó · ${name}`,
        html: layout({
          badge: "acta publicada",
          badgeFg: "#d1d5db",
          badgeBg: "rgba(255,255,255,.12)",
          body:
            heading(name, subtitle) +
            buyer +
            `<div style="margin:20px 0 0">${figures([
              { label: "Monto adjudicado", value: formatAmount(p.awarded) },
              { label: "Monto estimado", value: formatAmount(p.amount) },
            ])}</div>` +
            `<div style="margin:22px 0 0">${section("Ganador")}${facts([["Proveedor", p.winner ?? "sin informar"]])}</div>` +
            `<p style="margin:22px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${BODY}">Cierra la revisión como adjudicada o perdida, con el precio del ganador y la lección aprendida. Esa nota es la memoria de la empresa.</p>` +
            buttons({ href: link, label: "Registrar el cierre" }),
          footer: "El acta completa, con todos los oferentes y sus montos, queda en el histórico.",
        }),
        text: plain(
          name,
          [
            "SE PUBLICÓ EL ACTA",
            `Ganador: ${p.winner ?? "sin informar"}`,
            `Monto adjudicado: ${formatAmount(p.awarded)}`,
            "",
            "Cierra la revisión con el precio del ganador y la lección aprendida.",
          ],
          [`Ver ficha: ${link}`],
        ),
      };

    case "DAILY_DIGEST": {
      const c = p.counts ?? {};
      const cierres = p.closingThisWeek ?? [];

      const lista = cierres.length
        ? `<div style="margin:28px 0 0">${section("Cierres de esta semana")}
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
            ${cierres
              .map((t, i) => {
                const d = daysUntil(t.closesAt);
                const color = d !== null && d <= 2 ? "#b91c1c" : d !== null && d <= 5 ? "#b45309" : MUTED;
                return `<tr>
                  <td style="padding:9px 12px 9px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${SANS};font-size:14px;color:${INK}">${escape(t.name)}</td>
                  <td align="right" style="padding:9px 0;${i > 0 ? `border-top:1px solid ${RULE};` : ""}font-family:${SANS};font-size:13px;font-weight:600;color:${color};white-space:nowrap">${escape(urgency(d).label)}</td>
                </tr>`;
              })
              .join("")}
            </table></div>`
        : `<p style="margin:26px 0 0;font-family:${SANS};font-size:14px;color:${MUTED}">Ninguna licitación cierra esta semana.</p>`;

      /*
       * Estado del ultimo barrido (RN-07). Es el unico lugar donde el equipo se
       * entera de que el worker fallo sin entrar al servidor, asi que un fallo
       * va en rojo y con verbo, no como una fecha mas.
       */
      const barrido = p.sweep
        ? p.sweep.ok === false
          ? `<p style="margin:24px 0 0;padding:10px 14px;border:1px solid #fecaca;background:#fef2f2;font-family:${SANS};font-size:13px;color:#b91c1c;font-weight:600">El último barrido falló${p.sweep.finishedAt ? ` (${formatDateShort(p.sweep.finishedAt)})` : ""}. El tablero puede estar desactualizado.</p>`
          : `<p style="margin:24px 0 0;font-family:${SANS};font-size:12px;color:${FAINT}">Último barrido: ${escape(formatDateShort(p.sweep.finishedAt))}, sin errores.</p>`
        : "";

      return {
        subject: `Radar · ${c.nuevas ?? 0} nuevas, ${c.viables ?? 0} viables`,
        html: layout({
          badge: formatDate(new Date()),
          badgeFg: "#d1d5db",
          badgeBg: "rgba(255,255,255,.12)",
          body:
            heading("Resumen del día", "Estado del tablero") +
            `<div style="margin:22px 0 0">${figures([
              { label: "Nuevas", value: String(c.nuevas ?? 0) },
              { label: "En revisión", value: String(c.enRevision ?? 0) },
              { label: "Viables", value: String(c.viables ?? 0) },
            ])}</div>` +
            lista +
            barrido +
            buttons({ href: BASE, label: "Abrir el tablero" }),
          footer: "Resumen automático de las 08:00. Los avisos por licitación llegan aparte.",
        }),
        text: plain(
          `Resumen del ${formatDate(new Date())}`,
          [
            `Nuevas: ${c.nuevas ?? 0}`,
            `En revisión: ${c.enRevision ?? 0}`,
            `Viables: ${c.viables ?? 0}`,
            "",
            "Cierres de esta semana:",
            ...(cierres.length
              ? cierres.map((t) => `- ${t.name} (${urgency(daysUntil(t.closesAt)).label})`)
              : ["  ninguno"]),
            "",
            p.sweep
              ? p.sweep.ok === false
                ? "EL ÚLTIMO BARRIDO FALLÓ: el tablero puede estar desactualizado."
                : `Último barrido: ${formatDate(p.sweep.finishedAt)}, sin errores.`
              : "",
          ],
          [`Tablero: ${BASE}`],
        ),
      };
    }

    default:
      return null;
  }
}

// -------------------------------------------------------------------- envio

/** Entrega un correo ya armado. No decide nada: solo envia y reporta. */
export async function sendEmail(content: EmailContent, to = notifyRecipients()): Promise<SendResult> {
  if (to.length === 0) return { ok: false, error: "no hay destinatarios en NOTIFY_TO" };

  try {
    const { data, error } = await resend().emails.send({
      from: env.RESEND_FROM,
      to,
      replyTo: env.RESEND_REPLY_TO,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, providerId: data?.id };
  } catch (e) {
    // Red caida o Resend inalcanzable: se registra y se reintenta en el ciclo siguiente.
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
