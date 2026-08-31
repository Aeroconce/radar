/**
 * Elegir quien eres (D-24).
 *
 * La cuenta es compartida (D-22), asi que despues de entrar se elige un perfil
 * y todo lo que se escriba queda a su nombre sin volver a preguntarlo.
 *
 * `searchParams` se espera con await: en Next 16 las APIs de peticion son
 * asincronas y el acceso sincrono fue eliminado.
 */
import { requireSession } from "@/lib/session";
import { perfilesDisponibles } from "@/lib/perfil";
import { elegirPerfil } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Elegir perfil" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; error?: string }>;
}) {
  await requireSession();

  const { destino, error } = await searchParams;
  const perfiles = await perfilesDisponibles();

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Aeroconce
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            ¿Quién eres?
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Lo que revises y comentes quedará a tu nombre.
          </p>
        </div>

        {perfiles.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No hay perfiles configurados. Se definen en <code>Setting.teamMembers</code>{" "}
            y los carga <code>pnpm seed</code>.
          </p>
        ) : (
          <form action={elegirPerfil} className="space-y-2">
            <input type="hidden" name="destino" value={destino ?? "/"} />
            {perfiles.map((perfil) => (
              <button
                key={perfil}
                type="submit"
                name="perfil"
                value={perfil}
                className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-[#1c2f4a] hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#1c2f4a]/25"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1c2f4a] text-sm font-semibold text-white">
                  {perfil.charAt(0).toUpperCase()}
                </span>
                <span className="text-[15px] font-medium text-neutral-900">{perfil}</span>
              </button>
            ))}
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            Ese perfil ya no existe. Elige uno de la lista.
          </p>
        )}
      </div>
    </main>
  );
}
