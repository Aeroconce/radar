/**
 * Exportacion del tablero filtrado (RF-11).
 *
 * CSV que Excel abre con doble clic, no un .xlsx: el BOM le dice que es UTF-8
 * (sin el, las tildes llegan rotas) y el punto y coma es el separador que el
 * Excel en espanol espera (la coma es el separador decimal chileno). Armar un
 * .xlsx de verdad exigiria una dependencia entera para el mismo resultado
 * (D-34).
 *
 * Los filtros son los de la URL, los mismos del tablero (`tablero-filtros`):
 * lo que se baja es exactamente lo que se ve, sin paginar.
 */
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { parseFiltros, whereTablero } from "@/lib/tablero-filtros";
import { nombreComprador, nombreProceso, nombreVertical } from "@/lib/tenders";
import { ESTADOS } from "@/lib/reviews";

const fecha = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fmtFecha = (d: Date | null) => (d ? fecha.format(d) : "");

/**
 * Una celda CSV. Se escapa todo lo que confunda al separador, y un valor que
 * empiece con `=`, `+`, `-` o `@` se antepone con comilla simple: Excel lo
 * ejecutaria como formula, y los nombres vienen del portal.
 */
function celda(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return new Response("Sin sesión", { status: 401 });

  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filtros = parseFiltros(sp);

  const filas = await prisma.tender.findMany({
    where: await whereTablero(filtros),
    orderBy: [{ closesAt: { sort: "asc", nulls: "last" } }, { affinityScore: "desc" }],
    select: {
      code: true,
      name: true,
      buyerOrganism: true,
      buyerUnit: true,
      buyerType: true,
      region: true,
      processType: true,
      vertical: true,
      estimatedAmount: true,
      currency: true,
      affinityScore: true,
      reviewStatus: true,
      publishedAt: true,
      questionsUntil: true,
      closesAt: true,
      matchedTerms: true,
    },
  });

  const cabecera = [
    "Código",
    "Nombre",
    "Organismo",
    "Unidad",
    "Tipo de comprador",
    "Región",
    "Proceso",
    "Vertical",
    "Monto estimado",
    "Moneda",
    "Afinidad",
    "Estado",
    "Publicación",
    "Preguntas hasta",
    "Cierre",
    "Coincidencias",
    "Ficha",
    "Mercado Público",
  ];

  const lineas = filas.map((t) =>
    [
      celda(t.code),
      celda(t.name),
      celda(t.buyerOrganism),
      celda(t.buyerUnit),
      celda(nombreComprador(t.buyerType)),
      celda(t.region),
      celda(nombreProceso(t.processType)),
      celda(nombreVertical(t.vertical)),
      celda(t.estimatedAmount != null ? Number(t.estimatedAmount) : ""),
      celda(t.currency),
      celda(t.affinityScore),
      celda(ESTADOS[t.reviewStatus].etiqueta),
      celda(fmtFecha(t.publishedAt)),
      celda(fmtFecha(t.questionsUntil)),
      celda(fmtFecha(t.closesAt)),
      celda(t.matchedTerms.join(", ")),
      celda(`https://radar.aeroconce.cl/licitaciones/${t.code}`),
      celda(`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${t.code}`),
    ].join(";"),
  );

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
  const csv = "﻿" + [cabecera.join(";"), ...lineas].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="radar_tablero_${hoy}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
