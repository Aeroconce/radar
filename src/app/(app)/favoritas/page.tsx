/**
 * Favoritas del perfil activo (D-24).
 *
 * Son personales, no del equipo: el estado compartido ya lo lleva
 * `Tender.reviewStatus`. Aqui va lo que alguien quiere volver a mirar sin
 * comprometer al equipo con un estado.
 *
 * Se ordenan por cierre y no por cuando se marcaron: lo que urge manda, aunque
 * se haya marcado ayer. Por eso la tabla va sin cabeceras ordenables.
 *
 * Es la misma tabla del tablero (`tender-table.tsx`): pasar de una pantalla a la
 * otra no deberia obligar a releer las columnas.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { TenderTable } from "../tender-table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Favoritas" };

export default async function FavoritasPage() {
  await requireSession();
  const perfil = await perfilActivo();

  const favoritas = perfil
    ? await prisma.favorite.findMany({
        where: { profile: perfil },
        select: {
          tender: {
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
          },
        },
      })
    : [];

  // Por cierre, no por cuando se marco: lo que urge manda. Las que no tienen
  // fecha van al final, igual que en el tablero.
  const filas = favoritas
    .map((f) => f.tender)
    .sort(
      (a, b) =>
        (a.closesAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.closesAt?.getTime() ?? Number.POSITIVE_INFINITY),
    );

  // Todas son favoritas aqui; la estrella igual sirve para quitarlas.
  const marcadas = new Set(filas.map((t) => t.code));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Favoritas</h1>
        <p className="font-mono text-xs tabular-nums text-neutral-500">
          {filas.length} {filas.length === 1 ? "licitación" : "licitaciones"}
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

      {filas.length === 0 ? (
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
        <div className="mt-5">
          <TenderTable filas={filas} favoritas={marcadas} volver="/favoritas" />
        </div>
      )}
    </main>
  );
}
