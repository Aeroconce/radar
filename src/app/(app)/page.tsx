/**
 * Tablero (RF-04).
 *
 * Es una pantalla de triaje: responde "que miro ahora", no "como esta el
 * sistema". Por eso el plazo manda —a la derecha, en cifras monoespaciadas y con
 * color por cercania— y las metricas del sistema viven en la barra lateral, sin
 * competir por atencion aqui.
 *
 * Los filtros son la URL (RF-04: "reflejados en la URL para compartir enlaces"),
 * asi que la pantalla se resuelve entera en el servidor.
 *
 * La tabla vive en `tender-table.tsx`, compartida con las favoritas.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { parseFiltros, whereTablero } from "@/lib/tablero-filtros";
import { COMPRADORES, PROCESOS, VERTICALES } from "@/lib/tenders";
import { BoardFilters } from "./board-filters";
import { TenderTable, type ColumnaOrdenable } from "./tender-table";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

/*
 * `nulls` solo se acepta en campos que aceptan nulo: pasarselo a uno obligatorio
 * hace que Prisma rechace la consulta entera. `affinityScore` es Int @default(0).
 */
const ORDENES = {
  cierre: { campo: "closesAt", nulos: true },
  afinidad: { campo: "affinityScore", nulos: false },
  monto: { campo: "estimatedAmount", nulos: true },
  publicacion: { campo: "publishedAt", nulos: true },
} as const;

type ClaveOrden = keyof typeof ORDENES;

export default async function Tablero({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const perfil = await perfilActivo();
  const sp = await searchParams;

  const filtros = parseFiltros(sp);
  const { q } = filtros;
  const orden: ClaveOrden = sp.orden && sp.orden in ORDENES ? (sp.orden as ClaveOrden) : "cierre";
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const where = await whereTablero(filtros);

  const [total, licitaciones, conteosCrudos, verticalesCrudas, compradoresCrudos, procesosCrudos, regionesCrudas] = await Promise.all([
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
        opportunitySignals: true,
        structuralTags: true,
      },
    }),
    // Los conteos ignoran el filtro de estado: si no, al marcar "Nuevas" los
    // demas chips mostrarian cero y no se podria volver.
    prisma.tender.groupBy({
      by: ["reviewStatus"],
      _count: true,
      where: await whereTablero({ ...filtros, estados: [] }),
    }),
    prisma.tender.groupBy({ by: ["vertical"], _count: true }),
    prisma.tender.groupBy({ by: ["buyerType"], _count: true }),
    prisma.tender.groupBy({ by: ["processType"], _count: true }),
    prisma.tender.groupBy({ by: ["region"], _count: true, orderBy: { region: "asc" } }),
  ]);

  // Las favoritas son del perfil activo, no del equipo (D-26).
  const favoritas = new Set(
    perfil
      ? (
          await prisma.favorite.findMany({
            where: { profile: perfil, tender: { code: { in: licitaciones.map((t) => t.code) } } },
            select: { tender: { select: { code: true } } },
          })
        ).map((f) => f.tender.code)
      : [],
  );

  const conteos = conteosCrudos.map((c) => ({ estado: c.reviewStatus, total: c._count }));

  // Cada faceta lista solo lo que existe, con su conteo. Un desplegable con
  // quince regiones vacias es ruido; con las cuatro que tienen filas, un mapa.
  const facetas = {
    verticales: Object.entries(VERTICALES)
      .map(([valor, etiqueta]) => ({
        valor,
        etiqueta,
        total: verticalesCrudas.find((x) => x.vertical === valor)?._count ?? 0,
      }))
      .filter((v) => v.total > 0),
    compradores: Object.entries(COMPRADORES)
      .map(([valor, etiqueta]) => ({
        valor,
        etiqueta,
        total: compradoresCrudos.find((x) => x.buyerType === valor)?._count ?? 0,
      }))
      .filter((v) => v.total > 0),
    procesos: Object.entries(PROCESOS)
      .map(([valor, etiqueta]) => ({
        valor,
        etiqueta,
        total: procesosCrudos.find((x) => x.processType === valor)?._count ?? 0,
      }))
      .filter((v) => v.total > 0),
    regiones: regionesCrudas
      .filter((r) => r.region !== "")
      .map((r) => ({ valor: r.region, etiqueta: r.region, total: r._count })),
  };

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

  const ordenables: Record<string, ColumnaOrdenable> = Object.fromEntries(
    (["monto", "afinidad", "cierre"] as ClaveOrden[]).map((c) => [
      c,
      { clave: c, href: enlaceOrden(c), activa: orden === c, dir },
    ]),
  );

  /*
   * Cada fila lleva de vuelta el estado del tablero. Sin esto, volver desde una
   * ficha aterriza en el tablero sin filtros y hay que rehacer la busqueda.
   *
   * No sirve `history.back()`: los avisos por correo enlazan directo a una ficha,
   * y ahi el "atras" del navegador saca de la aplicacion.
   */
  const consultaActual = new URLSearchParams(sp as Record<string, string>).toString();
  const volver = consultaActual ? `/?${consultaActual}` : "/";

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Tablero</h1>
        <p className="font-mono text-xs tabular-nums text-neutral-500">
          {total} {total === 1 ? "licitación" : "licitaciones"}
        </p>
      </div>

      <div className="mt-5">
        <BoardFilters conteos={conteos} facetas={facetas} consulta={consultaActual} />
      </div>

      <div className="mt-5">
        <TenderTable
          filas={licitaciones}
          favoritas={favoritas}
          volver={volver}
          ordenables={ordenables}
        />
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

      {/* La red de seguridad contra un falso negativo (D-32): el tablero es lo
          seleccionado; si no aparece, hay que poder mirar en todo lo visto. */}
      <p className="mt-6 text-xs text-neutral-500">
        ¿No está lo que buscas?{" "}
        <Link
          href={q ? `/vistas?q=${encodeURIComponent(q)}` : "/vistas"}
          className="font-medium text-[#1c2f4a] hover:underline"
        >
          Buscar entre todas las activas vistas
        </Link>
        {q ? ` con «${q}»` : ""}. El tablero muestra lo seleccionado; el radar vio unas 4.700.
      </p>
    </main>
  );
}
