/**
 * Tablero (RF-04).
 *
 * Es una pantalla de triaje: responde "que miro ahora", no "como esta el
 * sistema". Por eso el plazo manda —esta a la derecha, en cifras monoespaciadas
 * y con color por cercania— y las metricas del sistema viven en la barra lateral,
 * no compitiendo por atencion aqui.
 *
 * Los filtros son la URL (RF-04: "reflejados en la URL para compartir enlaces"),
 * asi que la pantalla se resuelve entera en el servidor.
 */
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ESTADOS } from "@/lib/reviews";
import { BoardFilters } from "./board-filters";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

const VERTICALES: Array<{ valor: string; etiqueta: string }> = [
  { valor: "APPOINTMENTS", etiqueta: "Citas y contactabilidad" },
  { valor: "FIXED_ASSETS", etiqueta: "Activos fijos" },
  { valor: "DOCUMENT_MGMT", etiqueta: "Gestión documental" },
  { valor: "QUALITY_ACCREDITATION", etiqueta: "Calidad y acreditación" },
  { valor: "WEB_DEVELOPMENT", etiqueta: "Desarrollo web y plataformas" },
  { valor: "OTHER", etiqueta: "Otros" },
];

/*
 * `nulls` solo se acepta en campos que aceptan nulo: pasarselo a uno obligatorio
 * hace que Prisma rechace la consulta entera. `affinityScore` es Int @default(0),
 * asi que se ordena sin esa opcion.
 */
const ORDENES = {
  cierre: { etiqueta: "Cierre", campo: "closesAt", nulos: true },
  afinidad: { etiqueta: "Afinidad", campo: "affinityScore", nulos: false },
  monto: { etiqueta: "Monto", campo: "estimatedAmount", nulos: true },
  publicacion: { etiqueta: "Publicación", campo: "publishedAt", nulos: true },
} as const;

type ClaveOrden = keyof typeof ORDENES;

const monto = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fechaCorta = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
});

/** Fuera del componente: el compilador de React marca `Date.now()` dentro como impuro. */
function diasPara(d: Date | null): number | null {
  return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

function textoPlazo(d: number | null): string {
  if (d === null) return "sin fecha";
  if (d < 0) return "cerrada";
  if (d === 0) return "hoy";
  return `${d} ${d === 1 ? "día" : "días"}`;
}

/** Rojo bajo 2 dias, ambar bajo 5 (docs/06). */
function colorPlazo(d: number | null): string {
  if (d === null) return "text-neutral-400";
  if (d < 0) return "text-neutral-400";
  if (d <= 2) return "text-red-700";
  if (d <= 5) return "text-amber-700";
  return "text-neutral-600";
}

export default async function Tablero({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const estados = (sp.estado ?? "").split(",").filter(Boolean) as ReviewStatus[];
  const vertical = sp.vertical ?? "";
  const orden: ClaveOrden = sp.orden && sp.orden in ORDENES ? (sp.orden as ClaveOrden) : "cierre";
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  /*
   * La busqueda sin tildes necesita `unaccent`, que el API de filtros de Prisma
   * no expone. Se resuelve con una consulta cruda que devuelve solo los ids, y
   * el resto del filtrado sigue en Prisma, donde se lee.
   */
  let idsBusqueda: string[] | null = null;
  if (q) {
    const filas = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Tender"
      WHERE unaccent(lower(name))          LIKE unaccent(lower(${`%${q}%`}))
         OR unaccent(lower("buyerOrganism")) LIKE unaccent(lower(${`%${q}%`}))
         OR unaccent(lower(description))   LIKE unaccent(lower(${`%${q}%`}))
         OR lower(code)                    LIKE lower(${`%${q}%`})
    `;
    idsBusqueda = filas.map((f) => f.id);
  }

  const where: Prisma.TenderWhereInput = {
    ...(idsBusqueda !== null ? { id: { in: idsBusqueda } } : {}),
    ...(estados.length > 0 ? { reviewStatus: { in: estados } } : {}),
    ...(vertical ? { vertical: vertical as never } : {}),
  };

  const [total, licitaciones, conteosCrudos, verticalesCrudas] = await Promise.all([
    prisma.tender.count({ where }),
    prisma.tender.findMany({
      where,
      // Las que no tienen fecha van al final: una licitacion sin cierre no es lo
      // primero que hay que mirar. El desempate siempre es la afinidad.
      orderBy: [
        ORDENES[orden].nulos
          ? { [ORDENES[orden].campo]: { sort: dir, nulls: "last" } }
          : { [ORDENES[orden].campo]: dir },
        { affinityScore: "desc" },
      ],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        code: true,
        name: true,
        buyerOrganism: true,
        region: true,
        closesAt: true,
        estimatedAmount: true,
        currency: true,
        affinityScore: true,
        reviewStatus: true,
        vertical: true,
        outOfScale: true,
        incumbentSignals: true,
      },
    }),
    // Los conteos ignoran el filtro de estado —si no, al marcar "Nuevas" los
    // demas chips mostrarian cero y no se podria volver.
    prisma.tender.groupBy({
      by: ["reviewStatus"],
      _count: true,
      where: {
        ...(idsBusqueda !== null ? { id: { in: idsBusqueda } } : {}),
        ...(vertical ? { vertical: vertical as never } : {}),
      },
    }),
    prisma.tender.groupBy({ by: ["vertical"], _count: true }),
  ]);

  const conteos = conteosCrudos.map((c) => ({ estado: c.reviewStatus, total: c._count }));
  const verticales = VERTICALES.map((v) => ({
    ...v,
    total: verticalesCrudas.find((x) => x.vertical === v.valor)?._count ?? 0,
  })).filter((v) => v.total > 0);

  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlaceOrden = (clave: ClaveOrden) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.set("orden", clave);
    p.set("dir", orden === clave && dir === "asc" ? "desc" : "asc");
    p.delete("pagina");
    return `/?${p.toString()}`;
  };
  const enlacePagina = (n: number) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    p.set("pagina", String(n));
    return `/?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Tablero</h1>
        <p className="font-mono text-xs tabular-nums text-neutral-500">
          {total} {total === 1 ? "licitación" : "licitaciones"}
        </p>
      </div>

      <div className="mt-5">
        <BoardFilters conteos={conteos} verticales={verticales} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/70">
              {[
                ["Estado", null],
                ["Licitación", null],
                ["Vertical", null],
                ["Monto", "monto"],
                ["Afinidad", "afinidad"],
                ["Cierre", "cierre"],
              ].map(([etiqueta, clave]) => (
                <th
                  key={etiqueta}
                  scope="col"
                  className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 ${
                    clave === "monto" || clave === "afinidad" || clave === "cierre"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {clave ? (
                    <Link
                      href={enlaceOrden(clave as ClaveOrden)}
                      className="inline-flex items-center gap-1 hover:text-neutral-900"
                    >
                      {etiqueta}
                      {orden === clave && (
                        <span aria-hidden className="text-[9px]">
                          {dir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    etiqueta
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {licitaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-neutral-500">
                  No hay licitaciones con estos filtros.
                </td>
              </tr>
            )}
            {licitaciones.map((t) => {
              const d = diasPara(t.closesAt);
              return (
                <tr key={t.code} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[t.reviewStatus].color}`}
                    >
                      {ESTADOS[t.reviewStatus].etiqueta}
                    </span>
                  </td>
                  <td className="max-w-md px-3 py-2.5 align-top">
                    <Link
                      href={`/licitaciones/${encodeURIComponent(t.code)}`}
                      className="line-clamp-2 font-medium text-neutral-900 hover:text-[#1c2f4a] hover:underline"
                    >
                      {t.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      <span className="font-mono">{t.code}</span>
                      {" · "}
                      {t.buyerOrganism}
                      {t.region ? ` · ${t.region}` : ""}
                    </p>
                    {t.incumbentSignals.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        posible proveedor instalado
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-neutral-600">
                    {VERTICALES.find((v) => v.valor === t.vertical)?.etiqueta ?? t.vertical}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-700">
                    {t.estimatedAmount ? (
                      <>
                        {monto.format(Number(t.estimatedAmount))}
                        {t.currency !== "CLP" && (
                          <span className="ml-1 text-neutral-400">{t.currency}</span>
                        )}
                        {t.outOfScale && (
                          <span className="ml-1 text-neutral-400" title="Fuera de escala">
                            ↑
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-700">
                    {t.affinityScore}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">
                    <span className={`block font-mono text-xs font-semibold tabular-nums ${colorPlazo(d)}`}>
                      {textoPlazo(d)}
                    </span>
                    {t.closesAt && (
                      <span className="block font-mono text-[11px] tabular-nums text-neutral-400">
                        {fechaCorta.format(t.closesAt)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          <span className="font-mono text-xs tabular-nums text-neutral-500">
            página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link
                href={enlacePagina(pagina - 1)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
              >
                Anterior
              </Link>
            )}
            {pagina < paginas && (
              <Link
                href={enlacePagina(pagina + 1)}
                className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Faltan por construir los filtros de región, monto, tipo de comprador y tipo de proceso, y la
        exportación a Excel (RF-11).
      </p>
    </main>
  );
}
