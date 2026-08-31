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
import { normalize } from "@/lib/affinity/rules";
import { SearchBox } from "./search-box";
import { PullButton } from "./pull-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Todas las vistas" };

const MAX_FILAS = 100;

/**
 * Temas frecuentes, para buscar sin escribir.
 *
 * Son los terminos con los que el equipo pregunta, no las verticales del motor:
 * un clic arma la consulta y el conteo dice de antemano cuanto hay. Se calculan
 * sobre los nombres ya cargados; son ~4.700 textos cortos y sale mas barato que
 * decidir un indice.
 */
const TEMAS = [
  "software",
  "sistema",
  "plataforma",
  "desarrollo",
  "web",
  "aplicacion",
  "licencia",
  "saas",
  "arriendo",
  "agendamiento",
  "contactabilidad",
  "gestion documental",
  "digitalizacion",
  "expediente",
  "inventario",
  "activos",
  "acreditacion",
  "mesa de ayuda",
  "e-learning",
  "ciberseguridad",
  "encuesta",
  "erp",
];

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

  // Una sola pasada por los nombres alimenta el total y los conteos de temas.
  const nombres = (await prisma.seenTender.findMany({ select: { name: true } })).map((v) =>
    normalize(v.name),
  );
  const total = nombres.length;
  const temas = TEMAS.map((tema) => ({
    tema,
    total: nombres.filter((n) => n.includes(tema)).length,
  })).filter((t) => t.total > 0);

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

      {/* Buscar sin escribir: cada tema es la consulta ya armada, con su conteo. */}
      <div className="mt-3 flex max-w-3xl flex-wrap gap-1.5">
        {temas.map((t) => {
          const activo = q.toLowerCase() === t.tema;
          return (
            <Link
              key={t.tema}
              href={`/vistas?q=${encodeURIComponent(t.tema)}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                activo
                  ? "bg-[#1c2f4a] text-white ring-[#1c2f4a]"
                  : "bg-white text-neutral-600 ring-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {t.tema}
              <span className="font-mono tabular-nums opacity-60">{t.total}</span>
            </Link>
          );
        })}
      </div>

      {q === "" ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          Elige un tema o escribe qué buscas: nombre, organismo o código.
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
