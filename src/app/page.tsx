/**
 * Portada del radar.
 *
 * Provisional: el tablero de RF-04 va aqui. Por ahora muestra el estado real de
 * la base para poder comprobar de punta a punta que la sesion y los datos
 * funcionan, en vez de una pantalla de bienvenida vacia.
 */
import type { ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

const ETIQUETAS: Record<ReviewStatus, string> = {
  NEW: "Nuevas",
  IN_REVIEW: "En revisión",
  VIABLE: "Viables",
  DISCARDED: "Descartadas",
  SUBMITTED: "Ofertadas",
  AWARDED: "Adjudicadas",
  LOST: "Perdidas",
};

/** Orden de lectura: lo que espera trabajo primero, lo cerrado al final (docs/06). */
const ORDEN: ReviewStatus[] = [
  "NEW",
  "IN_REVIEW",
  "VIABLE",
  "SUBMITTED",
  "AWARDED",
  "LOST",
  "DISCARDED",
];

export default async function Home() {
  await requireSession();

  const [porEstado, ultimoBarrido, avisos, vistas] = await Promise.all([
    prisma.tender.groupBy({ by: ["reviewStatus"], _count: true }),
    prisma.jobRun.findFirst({ where: { type: "SWEEP" }, orderBy: { startedAt: "desc" } }),
    prisma.notification.count({ where: { status: "SENT" } }),
    prisma.seenTender.count(),
  ]);

  const conteos = new Map(porEstado.map((r) => [r.reviewStatus, r._count]));
  const total = porEstado.reduce((s, r) => s + r._count, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-start justify-between border-b border-neutral-200 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Aeroconce
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Radar de Licitaciones
          </h1>
        </div>
        <SignOutButton />
      </header>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Tablero
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
          {ORDEN.filter((e) => conteos.get(e)).map((estado) => (
            <div key={estado} className="bg-white px-4 py-3">
              <dd className="text-2xl font-semibold tabular-nums text-neutral-900">
                {conteos.get(estado)}
              </dd>
              <dt className="mt-0.5 text-xs text-neutral-500">{ETIQUETAS[estado]}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Estado del sistema
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between border-b border-neutral-100 py-1.5">
            <dt className="text-neutral-500">Licitaciones en el tablero</dt>
            <dd className="tabular-nums text-neutral-900">{total}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-1.5">
            <dt className="text-neutral-500">Activas vistas por el barrido</dt>
            <dd className="tabular-nums text-neutral-900">{vistas}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 py-1.5">
            <dt className="text-neutral-500">Avisos enviados</dt>
            <dd className="tabular-nums text-neutral-900">{avisos}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-neutral-500">Último barrido</dt>
            <dd className="text-neutral-900">
              {ultimoBarrido?.finishedAt
                ? new Intl.DateTimeFormat("es-CL", {
                    timeZone: "America/Santiago",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(ultimoBarrido.finishedAt)
                : "todavía no corre"}
              {ultimoBarrido?.ok === false && (
                <span className="ml-2 text-red-700">terminó con error</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-10 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        El tablero con búsqueda, filtros y la ficha de cada licitación (RF-04 a RF-07)
        va en esta pantalla. Por ahora el worker ya está buscando y avisando por correo.
      </p>
    </main>
  );
}
