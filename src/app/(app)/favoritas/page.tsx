/**
 * Favoritas del perfil activo (D-24).
 *
 * Son personales, no del equipo: el estado compartido ya lo lleva
 * `Tender.reviewStatus`. Aqui va lo que alguien quiere volver a mirar sin
 * comprometer al equipo con un estado.
 *
 * Se ordenan por cierre y no por cuando se marcaron: lo que urge manda, aunque
 * se haya marcado ayer.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { ESTADOS } from "@/lib/reviews";
import { StarButton } from "../star-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Favoritas" };

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

function colorPlazo(d: number | null): string {
  if (d === null || d < 0) return "text-neutral-400";
  if (d <= 2) return "text-red-700";
  if (d <= 5) return "text-amber-700";
  return "text-neutral-600";
}

export default async function FavoritasPage() {
  await requireSession();
  const perfil = await perfilActivo();

  const favoritas = perfil
    ? await prisma.favorite.findMany({
        where: { profile: perfil },
        include: {
          tender: {
            select: {
              code: true,
              name: true,
              buyerOrganism: true,
              closesAt: true,
              affinityScore: true,
              reviewStatus: true,
            },
          },
        },
      })
    : [];

  // Por cierre, no por cuando se marco: lo que urge manda.
  const ordenadas = favoritas.sort((a, b) => {
    const ca = a.tender.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const cb = b.tender.closesAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return ca - cb;
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Favoritas</h1>
        <p className="font-mono text-xs tabular-nums text-neutral-500">
          {ordenadas.length} {ordenadas.length === 1 ? "licitación" : "licitaciones"}
        </p>
      </div>

      <p className="mt-1 text-sm text-neutral-500">
        {perfil ? (
          <>
            Las que marcó <strong className="font-medium text-neutral-700">{perfil}</strong>. Son
            personales: cada perfil tiene las suyas.
          </>
        ) : (
          "Elige un perfil para tener favoritas."
        )}
      </p>

      {ordenadas.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
          <p className="text-sm text-neutral-600">Todavía no has marcado ninguna.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Usa la estrella del tablero para guardar las que quieras volver a mirar.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-[#1c2f4a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16253b]"
          >
            Ir al tablero
          </Link>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {ordenadas.map((f) => {
            const t = f.tender;
            const d = diasPara(t.closesAt);
            return (
              <li key={f.id} className="flex items-start gap-2 px-3 py-3 hover:bg-neutral-50">
                <StarButton code={t.code} favorita className="mt-0.5" />
                <Link
                  href={`/licitaciones/${encodeURIComponent(t.code)}?volver=%2Ffavoritas`}
                  className="min-w-0 flex-1"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[t.reviewStatus].color}`}
                    >
                      {ESTADOS[t.reviewStatus].etiqueta}
                    </span>
                    <span className="text-sm font-medium text-neutral-900">{t.name}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    <span className="font-mono">{t.code}</span> · {t.buyerOrganism}
                  </span>
                </Link>
                <span className="shrink-0 text-right">
                  <span className={`block font-mono text-xs font-semibold tabular-nums ${colorPlazo(d)}`}>
                    {textoPlazo(d)}
                  </span>
                  {t.closesAt && (
                    <span className="block font-mono text-[11px] tabular-nums text-neutral-400">
                      {fechaCorta.format(t.closesAt)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
