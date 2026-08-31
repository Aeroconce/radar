/**
 * Envoltorio de las pantallas con sesion (docs/06).
 *
 * Barra lateral fija con la navegacion, para que cada seccion tenga su pantalla
 * en vez de apilarse todo en una sola. El login y la eleccion de perfil quedan
 * fuera de este grupo de rutas: ahi no hay nada que navegar.
 *
 * Las secciones que todavia no existen se muestran apagadas y marcadas, no
 * ocultas: asi el equipo ve la forma que va a tener sin toparse con enlaces
 * que no llevan a ninguna parte.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { perfilActivo } from "@/lib/perfil";
import { requireSession } from "@/lib/session";
import { cambiarPerfil } from "../perfil/actions";
import { SignOutButton } from "./sign-out-button";
import { NavLink } from "./nav-link";

export const dynamic = "force-dynamic";

const SECCIONES = [
  { href: "/", etiqueta: "Tablero", listo: true },
  { href: "/historico", etiqueta: "Histórico", listo: false },
  { href: "/reglas", etiqueta: "Reglas", listo: false },
  { href: "/configuracion", etiqueta: "Configuración", listo: false },
  { href: "/auditoria", etiqueta: "Auditoría", listo: false },
];

const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  const perfil = await perfilActivo();

  // Estado del ultimo barrido: es el unico lugar de la interfaz donde se ve que
  // el worker fallo, ahora que no hay endpoint de salud (RN-07, D-25).
  const barrido = await prisma.jobRun.findFirst({
    where: { type: "SWEEP" },
    orderBy: { startedAt: "desc" },
    select: { finishedAt: true, ok: true },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="shrink-0 px-5 pb-6 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Aeroconce
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tracking-tight text-neutral-900">
            Radar de Licitaciones
          </p>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3">
          <ul className="space-y-0.5">
            {SECCIONES.map((s) => (
              <li key={s.href}>
                {s.listo ? (
                  <NavLink href={s.href}>{s.etiqueta}</NavLink>
                ) : (
                  <span
                    className="flex cursor-default items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-400"
                    title="Todavía no está construida"
                  >
                    {s.etiqueta}
                    <span className="text-[10px] uppercase tracking-wider">pronto</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-neutral-200 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Último barrido
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            {barrido?.finishedAt ? fechaHora.format(barrido.finishedAt) : "todavía no corre"}
            {barrido?.ok === false && (
              <span className="ml-1.5 font-medium text-red-700">falló</span>
            )}
          </p>
        </div>

        <div className="shrink-0 border-t border-neutral-200 p-3">
          {perfil && (
            <form action={cambiarPerfil}>
              <button
                type="submit"
                title="Cambiar de perfil"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1c2f4a] text-xs font-semibold text-white">
                  {perfil.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 text-left font-medium">{perfil}</span>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                  cambiar
                </span>
              </button>
            </form>
          )}
          <div className="mt-1 px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* En pantallas chicas el lateral desaparece y queda una barra arriba. */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-3 lg:hidden">
          <Link href="/" className="text-sm font-semibold text-neutral-900">
            Radar de Licitaciones
          </Link>
          {perfil && (
            <form action={cambiarPerfil}>
              <button
                type="submit"
                className="flex size-7 items-center justify-center rounded-full bg-[#1c2f4a] text-xs font-semibold text-white"
                title={`${perfil} · cambiar de perfil`}
              >
                {perfil.charAt(0).toUpperCase()}
              </button>
            </form>
          )}
        </header>

        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
