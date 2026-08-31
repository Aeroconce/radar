/**
 * Ficha de una licitacion (RF-05, RF-06).
 *
 * Es a donde apunta el boton "Ver ficha" de los avisos por correo, asi que la
 * ruta usa el **codigo** de Mercado Publico y no el id interno: es lo que la
 * persona reconoce y lo que ya viaja en los correos enviados.
 *
 * `params` se espera con await: en Next 16 las APIs de peticion son asincronas.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { ESTADOS, textoMotivo } from "@/lib/reviews";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

const monto = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const fechaLarga = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "long",
});
const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "medium",
  timeStyle: "short",
});

const PROCESO: Record<string, string> = {
  L1: "L1 · menor a 100 UTM",
  LE: "LE · entre 100 y 1.000 UTM",
  LP: "LP · entre 1.000 y 5.000 UTM",
  LQ: "LQ · entre 5.000 y 10.000 UTM",
  LR: "LR · sobre 10.000 UTM",
  LS: "LS · servicios personales",
  OTHER: "otro",
};

const VERTICAL: Record<string, string> = {
  APPOINTMENTS: "Citas y contactabilidad",
  FIXED_ASSETS: "Activos fijos",
  DOCUMENT_MGMT: "Gestión documental",
  QUALITY_ACCREDITATION: "Calidad y acreditación",
  WEB_DEVELOPMENT: "Desarrollo web y plataformas",
  OTHER: "Otros",
};

const fmtMonto = (v: unknown) => (v == null ? "no publicado" : monto.format(Number(v)));
const fmtFecha = (d: Date | null) => (d ? fechaLarga.format(d) : "—");

function diasPara(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await prisma.tender.findUnique({ where: { code }, select: { name: true } });
  return { title: t?.name ?? "Licitación" };
}

export default async function FichaPage({ params }: { params: Promise<{ code: string }> }) {
  await requireSession();
  const perfil = await perfilActivo();
  const { code } = await params;

  const tender = await prisma.tender.findUnique({
    where: { code },
    include: { reviews: { orderBy: { createdAt: "desc" }, include: { user: true } } },
  });
  if (!tender) notFound();

  // Contexto: que se adjudico antes en esta vertical y a este comprador. Es lo
  // que antes habia que buscar a mano (docs/06).
  const historial = await prisma.historicalAward.findMany({
    where: { OR: [{ vertical: tender.vertical }, { buyerOrganism: tender.buyerOrganism }] },
    orderBy: { awardedAt: "desc" },
    take: 6,
    include: { bids: { where: { result: "Adjudicada" }, take: 1 } },
  });

  const dias = diasPara(tender.closesAt);
  const estado = ESTADOS[tender.reviewStatus];
  const items = Array.isArray((tender.items as { Listado?: unknown[] })?.Listado)
    ? ((tender.items as { Listado: Array<Record<string, unknown>> }).Listado ?? [])
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Tablero
      </Link>

      <header className="mt-4 border-b border-neutral-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${estado.color}`}>
            {estado.etiqueta}
          </span>
          {dias !== null && (
            <span
              className={`text-xs font-medium ${dias <= 2 ? "text-red-700" : dias <= 5 ? "text-amber-700" : "text-neutral-500"}`}
            >
              {dias < 0 ? "cerrada" : dias === 0 ? "cierra hoy" : `cierra en ${dias} día${dias === 1 ? "" : "s"}`}
            </span>
          )}
          {tender.outOfScale && (
            <span className="text-xs text-neutral-500">· fuera de escala</span>
          )}
        </div>
        <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-neutral-900">
          {tender.name}
        </h1>
        <p className="mt-1.5 font-mono text-xs text-neutral-500">
          {tender.code} · {PROCESO[tender.processType] ?? tender.processType}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Comprador
            </h2>
            <p className="mt-2 text-[15px] font-medium text-neutral-900">{tender.buyerOrganism}</p>
            <p className="text-sm text-neutral-500">
              {[tender.buyerUnit, tender.region].filter(Boolean).join(" · ")}
            </p>
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Datos
            </h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ["Monto estimado", fmtMonto(tender.estimatedAmount)],
                ["Moneda", tender.currency],
                ["Duración", tender.durationValue ? `${tender.durationValue} ${tender.durationUnit}` : "—"],
                ["Publicación", fmtFecha(tender.publishedAt)],
                ["Preguntas hasta", fmtFecha(tender.questionsUntil)],
                ["Respuestas", fmtFecha(tender.answersAt)],
                ["Cierre", fmtFecha(tender.closesAt)],
                ["Adjudicación estimada", fmtFecha(tender.awardEstimatedAt)],
                ["Vertical", VERTICAL[tender.vertical] ?? tender.vertical],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-neutral-500">{k}</dt>
                  <dd className="mt-0.5 text-neutral-900">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {(tender.matchedTerms.length > 0 || tender.incumbentSignals.length > 0) && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Por qué apareció
              </h2>
              <p className="mt-2 text-sm text-neutral-700">
                Afinidad <strong className="text-neutral-900">{tender.affinityScore}</strong>.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tender.matchedTerms.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {tender.incumbentSignals.length > 0 && (
                <p className="mt-3 rounded-md border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <strong className="font-semibold">Posible proveedor instalado.</strong> Las bases
                  mencionan {tender.incumbentSignals.join(", ")}. Léelas con eso en mente.
                </p>
              )}
            </section>
          )}

          {tender.description && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Descripción
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {tender.description}
              </p>
            </section>
          )}

          {items.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Ítems ({items.length})
              </h2>
              <ul className="mt-2 space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="border-b border-neutral-100 pb-2 text-sm last:border-0">
                    <p className="text-neutral-900">{String(it.NombreProducto ?? "sin nombre")}</p>
                    {it.Descripcion ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                        {String(it.Descripcion)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {historial.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Antes en esta vertical o con este comprador
              </h2>
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2 pr-3 text-neutral-900">{h.name}</td>
                      <td className="py-2 pr-3 text-xs text-neutral-500">
                        {h.bids[0]?.supplierName ?? "sin ganador"}
                      </td>
                      <td className="py-2 text-right text-xs tabular-nums text-neutral-500">
                        {h.awardedAt ? fechaLarga.format(h.awardedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Bitácora
            </h2>
            {tender.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">Todavía no hay revisiones.</p>
            ) : (
              <ol className="mt-3 space-y-4">
                {tender.reviews.map((r) => (
                  <li key={r.id} className="border-l-2 border-neutral-200 pl-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[r.status].color}`}
                      >
                        {ESTADOS[r.status].etiqueta}
                      </span>
                      <span className="text-sm font-medium text-neutral-800">{r.authorName}</span>
                      <span className="text-xs text-neutral-400">
                        {fechaHora.format(r.createdAt)}
                      </span>
                    </div>
                    {r.reasons.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {r.reasons.map((m) => (
                          <li key={m} className="text-xs text-neutral-500">
                            · {textoMotivo(m)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.note && (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                        {r.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <ReviewForm code={tender.code} estadoActual={tender.reviewStatus} perfil={perfil} />
          <a
            href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(tender.code)}`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Abrir en Mercado Público
          </a>
          <p className="px-1 text-xs leading-relaxed text-neutral-500">
            Las bases se descargan del portal: la API pública no las entrega.
          </p>
        </aside>
      </div>
    </main>
  );
}
