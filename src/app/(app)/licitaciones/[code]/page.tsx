/**
 * Ficha de una licitacion (RF-05, RF-06).
 *
 * Es a donde apunta el boton "Ver ficha" de los avisos por correo, asi que la
 * ruta usa el **codigo** de Mercado Publico y no el id interno: es lo que la
 * persona reconoce y lo que ya viaja en los correos enviados.
 *
 * ## Como esta ordenada
 *
 * Izquierda la licitacion como documento, derecha la decision. Y dentro del
 * documento, un orden por lo que se pregunta primero:
 *
 *   1. **Cuanto y cuando** — monto, cierre y fin de preguntas, en una franja
 *      arriba. Son las tres cifras que deciden si vale la pena seguir leyendo.
 *   2. **Quien compra**.
 *   3. **Por que la trajo el radar** — antes de leer nada, saber si el sistema
 *      tuvo una buena razon.
 *   4. **De que se trata** — descripcion e items.
 *   5. **Que paso antes** — historico y bitacora.
 *
 * El resto de los datos (moneda, duracion, publicacion, respuestas) baja a un
 * bloque secundario: hacen falta, pero no compiten con lo de arriba.
 *
 * Toda cifra va en monoespaciada. No es decoracion: separa dato de prosa y
 * alinea columnas de numeros que si no habria que leer de a uno.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { ESTADOS, rotuloMotivo, textoMotivo } from "@/lib/reviews";
import { nombreProceso, nombreVertical } from "@/lib/tenders";
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
const fechaCorta = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "medium",
  timeStyle: "short",
});

const fmtMonto = (v: unknown) => (v == null ? "no publicado" : monto.format(Number(v)));
const fmtFecha = (d: Date | null) => (d ? fechaLarga.format(d) : "—");

/** Fuera del componente: el compilador de React marca `Date.now()` dentro como impuro. */
function diasPara(d: Date | null): number | null {
  return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

function textoPlazo(d: number | null): string {
  if (d === null) return "sin fecha de cierre";
  if (d < 0) return "cerrada";
  if (d === 0) return "cierra hoy";
  return `cierra en ${d} ${d === 1 ? "día" : "días"}`;
}

/** Rojo bajo 2 dias, ambar bajo 5 (docs/06). */
function colorPlazo(d: number | null): string {
  if (d === null || d < 0) return "text-neutral-500";
  if (d <= 2) return "text-red-700";
  if (d <= 5) return "text-amber-700";
  return "text-neutral-900";
}

/** Encabezado de seccion: rotulo corto anclado por una regla. */
function Seccion({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {children}
      </h2>
      <span className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await prisma.tender.findUnique({ where: { code }, select: { name: true } });
  return { title: t?.name ?? "Licitación" };
}

export default async function FichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ volver?: string }>;
}) {
  await requireSession();
  const perfil = await perfilActivo();
  const { code } = await params;
  const { volver } = await searchParams;

  // Solo rutas internas: un destino externo convertiria el enlace de vuelta en
  // una forma de sacar a alguien del sitio desde un enlace que parece propio.
  const destinoVuelta =
    volver && volver.startsWith("/") && !volver.startsWith("//") ? volver : "/";

  const tender = await prisma.tender.findUnique({
    where: { code },
    include: { reviews: { orderBy: { createdAt: "desc" } } },
  });
  if (!tender) notFound();

  // Contexto: que se adjudico antes en esta vertical y a este comprador. Es lo
  // que antes habia que buscar a mano (docs/06).
  const historial = await prisma.historicalAward.findMany({
    where: {
      OR: [{ vertical: tender.vertical }, { buyerOrganism: tender.buyerOrganism }],
    },
    orderBy: { awardedAt: "desc" },
    take: 6,
    include: { bids: { where: { result: "Adjudicada" }, take: 1 } },
  });

  const dias = diasPara(tender.closesAt);
  const estado = ESTADOS[tender.reviewStatus];
  const items = Array.isArray((tender.items as { Listado?: unknown[] })?.Listado)
    ? ((tender.items as { Listado: Array<Record<string, unknown>> }).Listado ?? [])
    : [];

  const detalleSecundario: Array<[string, string]> = [
    ["Moneda", tender.currency],
    ["Duración", tender.durationValue ? `${tender.durationValue} ${tender.durationUnit}` : "—"],
    ["Publicación", fmtFecha(tender.publishedAt)],
    ["Respuestas", fmtFecha(tender.answersAt)],
    ["Adjudicación estimada", fmtFecha(tender.awardEstimatedAt)],
    ["Vertical", nombreVertical(tender.vertical)],
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href={destinoVuelta}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-neutral-400">
          <path
            d="M7.5 2 3.5 6l4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Volver al tablero
      </Link>

      <header className="mt-4 flex items-start justify-between gap-6">
        <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${estado.color}`}
          >
            {estado.etiqueta}
          </span>
          <span className={`font-mono text-xs font-semibold ${colorPlazo(dias)}`}>
            {textoPlazo(dias)}
          </span>
          {tender.outOfScale && (
            <span className="text-xs text-neutral-500">· fuera de escala</span>
          )}
        </div>

        <h1 className="mt-2.5 max-w-3xl text-[22px] font-semibold leading-snug tracking-tight text-neutral-900">
          {tender.name}
        </h1>

        <p className="mt-2 font-mono text-xs text-neutral-500">
          {tender.code}
          <span className="mx-2 text-neutral-300">|</span>
          {nombreProceso(tender.processType)}
        </p>
        </div>

        {/* Fuera del panel de revision: ahi quedaba dentro de su scroll y habia
            que bajar para encontrarlo. Es lo primero que se hace con una ficha
            —leer las bases en el portal— asi que va a la altura del titulo. */}
        <a
          href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(tender.code)}`}
          target="_blank"
          rel="noreferrer"
          title="Las bases y los anexos se descargan del portal: la API pública no los entrega."
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
        >
          Abrir en Mercado Público
          <svg aria-hidden viewBox="0 0 12 12" className="size-3 text-neutral-400">
            <path
              d="M4.5 2h5.5v5.5M10 2 3 9M8 10H2V4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </header>

      <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-9">
          {/* Las tres cifras que deciden si vale la pena seguir leyendo. */}
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {[
              { rotulo: "Monto estimado", valor: fmtMonto(tender.estimatedAmount), color: "text-neutral-900" },
              {
                rotulo: "Cierre",
                valor: tender.closesAt ? fechaCorta.format(tender.closesAt) : "—",
                color: colorPlazo(dias),
              },
              {
                rotulo: "Preguntas hasta",
                valor: tender.questionsUntil ? fechaCorta.format(tender.questionsUntil) : "—",
                color: "text-neutral-900",
              },
            ].map((c, i) => (
              <div key={c.rotulo} className={`px-4 py-3.5 ${i > 0 ? "border-l border-neutral-200" : ""}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                  {c.rotulo}
                </p>
                <p className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${c.color}`}>
                  {c.valor}
                </p>
              </div>
            ))}
          </div>

          <section>
            <Seccion>Comprador</Seccion>
            <p className="text-[15px] font-medium leading-snug text-neutral-900">
              {tender.buyerOrganism}
            </p>
            {(tender.buyerUnit || tender.region) && (
              <p className="mt-0.5 text-sm text-neutral-500">
                {[tender.buyerUnit, tender.region].filter(Boolean).join(" · ")}
              </p>
            )}
          </section>

          <section>
            <Seccion>Por qué apareció</Seccion>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-2xl font-semibold tabular-nums leading-none text-neutral-900">
                {tender.affinityScore}
              </span>
              <span className="text-sm text-neutral-500">de afinidad</span>
              {(tender.structuralScore !== 0 || tender.structuralTags.length > 0) && (
                <span className="text-xs text-neutral-500">
                  texto {tender.textScore} {tender.structuralScore < 0 ? "−" : "+"} ficha {Math.abs(tender.structuralScore)}
                  {tender.structuralTags.length > 0 && ` · ${tender.structuralTags.join(" · ")}`}
                </span>
              )}
              {tender.matchedTerms.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {tender.matchedTerms.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-600"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </div>
            {tender.incumbentSignals.length > 0 && (
              <div className="mt-3 rounded-r border-l-[3px] border-amber-500 bg-amber-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800">
                  Posible proveedor instalado
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-amber-900">
                  Las bases mencionan {tender.incumbentSignals.join(", ")}. Léelas con eso en mente.
                </p>
              </div>
            )}
            {tender.opportunitySignals.length > 0 && (
              <div className="mt-3 rounded-r border-l-[3px] border-emerald-600 bg-emerald-50 px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">
                  Señal de oportunidad
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-emerald-900">
                  Las bases mencionan {tender.opportunitySignals.join(", ")}. Un relanzamiento o una reserva para
                  empresas de menor tamaño cambian la competencia.
                </p>
              </div>
            )}
          </section>

          {tender.description && (
            <section>
              <Seccion>Descripción</Seccion>
              {/* Ancho de lectura acotado: una linea de 120 caracteres se pierde
                  al saltar de renglon. */}
              <p className="max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {tender.description}
              </p>
            </section>
          )}

          {items.length > 0 && (
            <section>
              <Seccion>Ítems · {items.length}</Seccion>
              <ul className="space-y-2.5">
                {items.map((it, i) => (
                  <li key={i} className="border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-neutral-900">
                      {String(it.NombreProducto ?? "sin nombre")}
                    </p>
                    {it.Descripcion ? (
                      <p className="mt-0.5 max-w-[68ch] text-xs leading-relaxed text-neutral-500">
                        {String(it.Descripcion)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <Seccion>Otros datos</Seccion>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 sm:grid-cols-3">
              {detalleSecundario.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-neutral-400">{k}</dt>
                  <dd className="mt-0.5 font-mono text-[13px] tabular-nums text-neutral-700">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {historial.length > 0 && (
            <section>
              <Seccion>Antes en esta vertical o con este comprador</Seccion>
              <table className="w-full text-sm">
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id} className="border-b border-neutral-100 last:border-0">
                      <td className="py-2 pr-4 align-top text-neutral-800">{h.name}</td>
                      <td className="py-2 pr-4 align-top text-xs text-neutral-500">
                        {h.bids[0]?.supplierName ?? "sin ganador"}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right align-top font-mono text-xs tabular-nums text-neutral-400">
                        {h.awardedAt ? fechaCorta.format(h.awardedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <Seccion>Bitácora</Seccion>
            {tender.reviews.length === 0 ? (
              <p className="text-sm text-neutral-500">Todavía no hay revisiones.</p>
            ) : (
              <ol className="space-y-5">
                {tender.reviews.map((r) => (
                  <li key={r.id} className="border-l-2 border-neutral-200 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[r.status].color}`}
                      >
                        {ESTADOS[r.status].etiqueta}
                      </span>
                      <span className="text-sm font-medium text-neutral-800">{r.authorName}</span>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                        {fechaHora.format(r.createdAt)}
                      </span>
                    </div>
                    {r.reasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.reasons.map((m) => (
                          <span
                            key={m}
                            title={textoMotivo(m)}
                            className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600"
                          >
                            {rotuloMotivo(m)}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.note && (
                      <p className="mt-2 max-w-[68ch] whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                        {r.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Pegado arriba, con scroll propio: si el formulario crece mas que la
            ventana, el boton de guardar tiene que seguir alcanzable. */}
        <aside className="space-y-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pb-6">
          <ReviewForm code={tender.code} estadoActual={tender.reviewStatus} perfil={perfil} />
        </aside>
      </div>
    </main>
  );
}
