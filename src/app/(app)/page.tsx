/**
 * Portada del radar.
 *
 * Provisional: el tablero de RF-04 va aqui. Por ahora muestra el estado real de
 * la base para poder comprobar de punta a punta que la sesion y los datos
 * funcionan, en vez de una pantalla de bienvenida vacia.
 */
import Link from "next/link";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ESTADOS } from "@/lib/reviews";

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
/** Dias que faltan para una fecha. Fuera del componente: el compilador de React
 *  marca `Date.now()` en el cuerpo como impuro, y con razon. */
function diasPara(d: Date | null): number | null {
  return d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;
}

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

  // Lo que espera trabajo. El tablero completo con busqueda y filtros (RF-04) va
  // en esta pantalla; por ahora, la lista basta para llegar a una ficha sin
  // depender de tener un correo a mano.
  const [porEstado, ultimoBarrido, avisos, vistas, pendientes] = await Promise.all([
    prisma.tender.groupBy({ by: ["reviewStatus"], _count: true }),
    prisma.jobRun.findFirst({ where: { type: "SWEEP" }, orderBy: { startedAt: "desc" } }),
    prisma.notification.count({ where: { status: "SENT" } }),
    prisma.seenTender.count(),
    prisma.tender.findMany({
      where: { reviewStatus: { in: ["NEW", "IN_REVIEW", "VIABLE"] } },
      orderBy: [{ closesAt: "asc" }, { affinityScore: "desc" }],
      take: 25,
      select: {
        code: true,
        name: true,
        buyerOrganism: true,
        closesAt: true,
        affinityScore: true,
        reviewStatus: true,
      },
    }),
  ]);

  const conteos = new Map(porEstado.map((r) => [r.reviewStatus, r._count]));
  const total = porEstado.reduce((s, r) => s + r._count, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Tablero</h1>

      <section className="mt-6">
        <h2 className="sr-only">Estado por revisión</h2>
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

      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Esperan revisión
        </h2>
        {pendientes.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nada pendiente.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100">
            {pendientes.map((t) => {
              const d = diasPara(t.closesAt);
              return (
                <li key={t.code}>
                  <Link
                    href={`/licitaciones/${encodeURIComponent(t.code)}`}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-neutral-50"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[t.reviewStatus].color}`}
                    >
                      {ESTADOS[t.reviewStatus].etiqueta}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-900">{t.name}</span>
                      <span className="block truncate text-xs text-neutral-500">
                        {t.buyerOrganism}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block text-xs font-medium tabular-nums ${
                          d !== null && d <= 2
                            ? "text-red-700"
                            : d !== null && d <= 5
                              ? "text-amber-700"
                              : "text-neutral-500"
                        }`}
                      >
                        {d === null ? "—" : d < 0 ? "cerrada" : d === 0 ? "hoy" : `${d} días`}
                      </span>
                      <span className="block text-xs tabular-nums text-neutral-400">
                        afinidad {t.affinityScore}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-neutral-500">
          Búsqueda, filtros y orden (RF-04) van en esta pantalla.
        </p>
      </section>
    </main>
  );
}
