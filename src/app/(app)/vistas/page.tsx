/**
 * Todas las activas vistas por el radar (D-32).
 *
 * El tablero muestra lo que las reglas seleccionaron; esta pantalla muestra
 * **todo lo que el radar vio** en el ultimo barrido, ~4.700 activas. Existe
 * para una sola pregunta: «¿se le escapó algo a las reglas?». Por eso no tiene
 * filtros ni orden configurable: se busca un texto, se mira, y si algo bueno
 * quedo fuera se trae con un boton.
 *
 * Sin busqueda no se lista nada: cuatro mil filas sin pregunta no se pueden
 * leer, y paginarlas invitaria a intentarlo.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SearchBox } from "./search-box";
import { PullButton } from "./pull-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Todas las vistas" };

const MAX_FILAS = 100;

const fechaCorta = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
});

export default async function VistasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSession();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const total = await prisma.seenTender.count();

  /*
   * La busqueda sin tildes usa `unaccent`, como en el tablero. Son ~4.700 filas:
   * el recorrido completo cuesta menos que decidir un indice para esto.
   */
  const filas = q
    ? await prisma.$queryRaw<
        Array<{ code: string; name: string; closesAt: Date | null; lastScore: number; selected: boolean }>
      >`
      SELECT s.code, s.name, s."closesAt", s."lastScore", s.selected
      FROM "SeenTender" s
      WHERE unaccent(lower(s.name)) LIKE unaccent(lower(${`%${q}%`}))
         OR lower(s.code) LIKE lower(${`%${q}%`})
      ORDER BY s."lastScore" DESC, s."closesAt" ASC NULLS LAST
      LIMIT ${MAX_FILAS + 1}
    `
    : [];

  const recortada = filas.length > MAX_FILAS;
  const visibles = recortada ? filas.slice(0, MAX_FILAS) : filas;

  // Cuales ya estan en el tablero, para enlazar la ficha en vez de ofrecer traerla.
  const enTablero = new Set(
    visibles.length
      ? (
          await prisma.tender.findMany({
            where: { code: { in: visibles.map((f) => f.code) } },
            select: { code: true },
          })
        ).map((t) => t.code)
      : [],
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Todas las vistas</h1>
        <p className="font-mono text-xs tabular-nums text-neutral-500">
          {total} activas en el último barrido
        </p>
      </div>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">
        Todo lo que el radar vio, haya entrado al tablero o no. Si las reglas dejaron pasar algo
        bueno, búscalo aquí y tráelo con un clic: queda en la bitácora como aviso de que a las
        reglas les falta un término.
      </p>

      <div className="mt-5 max-w-xl">
        <SearchBox inicial={q} />
      </div>

      {q === "" ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          Escribe qué buscas: nombre, organismo o código.
        </p>
      ) : visibles.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          Nada entre las vistas con «{q}». El radar no vio esa licitación en el último barrido.
        </p>
      ) : (
        <>
          <div className="mt-5 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    Licitación
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    Afinidad
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    Cierre
                  </th>
                  <th scope="col" className="w-40 px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const dentro = enTablero.has(f.code);
                  return (
                    <tr key={f.code} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="max-w-md px-3 py-2.5 align-top">
                        <p className="line-clamp-2 font-medium text-neutral-900">{f.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-neutral-500">{f.code}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-700">
                        {f.lastScore}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-600">
                        {f.closesAt ? fechaCorta.format(f.closesAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right align-top">
                        {dentro ? (
                          <Link
                            href={`/licitaciones/${encodeURIComponent(f.code)}?volver=${encodeURIComponent(`/vistas?q=${q}`)}`}
                            className="text-xs font-medium text-[#1c2f4a] hover:underline"
                          >
                            En el tablero →
                          </Link>
                        ) : (
                          <PullButton code={f.code} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recortada && (
            <p className="mt-2 text-xs text-neutral-500">
              Se muestran las primeras {MAX_FILAS} por afinidad. Afina la búsqueda para ver el resto.
            </p>
          )}
        </>
      )}
    </main>
  );
}
