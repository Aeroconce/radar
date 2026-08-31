/**
 * Reglas de afinidad (RF-09, docs/04).
 *
 * Es la unica pantalla donde se cambia que ve el equipo manana. El orden de
 * arriba abajo va de lo que mas decide a lo que solo informa: primero los cuatro
 * numeros que fijan el corte, despues las palabras clave y las exclusiones, y al
 * final las senales, que no puntuan.
 *
 * Nada se guarda sin poder verse antes: cada formulario trae "probar", que
 * calcula el efecto sobre las activas del ultimo barrido sin escribir (docs/04).
 *
 * RF-09 la reserva al Administrador. Con una sola cuenta compartida (D-22) ese
 * rol no distingue a nadie; lo que queda como control es la bitacora, que anota
 * cada cambio con el perfil que lo hizo.
 */
import { prisma } from "@/lib/db";
import { ORDEN_TIPOS } from "@/lib/rule-kinds";
import { requireSession } from "@/lib/session";
import { loadSettings } from "@/lib/settings";
import { ParamsForm } from "./params-form";
import { RecalcButton } from "./recalc-button";
import { RulesSection, type ReglaVista } from "./rules-section";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reglas" };

const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ReglasPage() {
  await requireSession();

  const [settings, filas, barrido, vistas] = await Promise.all([
    loadSettings(),
    prisma.affinityRule.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
    prisma.jobRun.findFirst({
      where: { type: "SWEEP", ok: true },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, finishedAt: true },
    }),
    prisma.seenTender.count(),
  ]);

  const reglas: ReglaVista[] = filas.map((r) => ({
    id: r.id,
    kind: r.kind,
    pattern: r.pattern,
    weight: r.weight,
    vertical: r.vertical,
    buyerType: r.buyerType,
    active: r.active,
    updatedBy: r.updatedBy,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">Reglas</h1>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">
        Qué selecciona el radar y cómo lo clasifica. El alcance es desarrollo y arriendo de sistemas:
        lo que no se entrega como software no entra, aunque su tema suene afín.
      </p>

      {/* Sin esta nota, dos cosas parecen errores y no lo son: las palabras sin
          tildes y las cortadas a la mitad. */}
      <div className="mt-4 max-w-3xl rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold text-neutral-700">Cómo leer los términos</p>
        <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-neutral-600">
          <li>
            Van <strong className="font-medium">sin tildes y en minúsculas</strong> porque el texto de
            las licitaciones se compara así. «acreditacion» encuentra «Acreditación».
          </li>
          <li>
            Algunos están <strong className="font-medium">cortados a propósito</strong>, para atrapar
            todas sus terminaciones: «interoperab» encuentra interoperable, interoperabilidad e
            interoperar.
          </li>
          <li>
            Es un resumen de lo que busca cada regla. La forma exacta, con la que trabaja el buscador,
            aparece al abrir <strong className="font-medium">Editar</strong>.
          </li>
        </ul>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold text-neutral-900">Parámetros</h2>
            {barrido?.finishedAt && (
              <span className="shrink-0 text-[11px] text-neutral-400">
                último barrido {fechaHora.format(barrido.finishedAt)} ·{" "}
                <span className="font-mono tabular-nums">{vistas}</span> activas vistas
              </span>
            )}
          </div>
          <ParamsForm inicial={settings} />
        </section>

        {ORDEN_TIPOS.map((kind) => (
          <RulesSection key={kind} kind={kind} reglas={reglas.filter((r) => r.kind === kind)} />
        ))}

        <RecalcButton />
      </div>
    </main>
  );
}
