/**
 * Resultado de "probar" un cambio de reglas (RF-09, docs/04).
 *
 * Lo que importa no es el numero final sino el movimiento: cuantas entran y
 * cuantas salen. Un cambio que deja el total igual puede haber cambiado por
 * completo *cuales*, y esa es justo la sorpresa que hay que poder ver antes de
 * guardar.
 *
 * Las que salen van primero y con mas peso visual: dejar de ver algo relevante
 * es el error caro del radar (docs/04). Si alguna de ellas ya tiene una revision
 * escrita, se dice aparte y en rojo.
 */
import type { Comparacion, FilaPrevia } from "@/lib/affinity/preview";
import { MAX_FILAS } from "@/lib/affinity/preview";

function Cifra({ etiqueta, valor, tono = "" }: { etiqueta: string; valor: number; tono?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {etiqueta}
      </p>
      <p className={`mt-0.5 font-mono text-xl tabular-nums ${tono || "text-neutral-900"}`}>
        {valor}
      </p>
    </div>
  );
}

function Lista({
  titulo,
  filas,
  total,
  tono,
}: {
  titulo: string;
  filas: FilaPrevia[];
  total: number;
  tono: "entra" | "sale";
}) {
  if (total === 0) return null;
  const color = tono === "sale" ? "text-red-800" : "text-emerald-800";

  return (
    <div>
      <p className="flex items-baseline gap-2 text-xs font-semibold text-neutral-700">
        {titulo}
        <span className={`font-mono tabular-nums ${color}`}>{total}</span>
      </p>
      {/* Con altura fija: sesenta filas empujarian las reglas fuera de la pantalla
          y habria que hacer scroll a ciegas para volver a lo que se estaba editando. */}
      <ul className="mt-1.5 max-h-72 divide-y divide-neutral-100 overflow-y-auto rounded-md border border-neutral-200 bg-white">
        {filas.map((f) => (
          <li key={f.code} className="flex items-start gap-3 px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-neutral-800">{f.name}</span>
              <span className="font-mono text-[11px] text-neutral-400">{f.code}</span>
              {f.revisada && (
                <span className="ml-2 text-[11px] font-medium text-red-700">ya revisada</span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums text-neutral-500">
              {f.antes} <span className="text-neutral-300">→</span>{" "}
              <span className={color}>{f.despues}</span>
            </span>
          </li>
        ))}
      </ul>
      {total > filas.length && (
        <p className="mt-1 text-[11px] text-neutral-500">
          Se listan {MAX_FILAS} de {total}. El resto cambia igual, solo no cabe aquí.
        </p>
      )}
    </div>
  );
}

export function PreviewResult({ c }: { c: Comparacion }) {
  const sinCambios = c.totalEntran === 0 && c.totalSalen === 0;

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <Cifra etiqueta="Activas de hoy" valor={c.activas} />
        <Cifra etiqueta="Se seleccionan hoy" valor={c.antes} />
        <Cifra
          etiqueta="Con este cambio"
          valor={c.despues}
          tono={
            c.despues === c.antes
              ? "text-neutral-900"
              : c.despues > c.antes
                ? "text-emerald-800"
                : "text-red-800"
          }
        />
      </div>

      {sinCambios ? (
        <p className="mt-4 text-sm text-neutral-600">
          Sobre las activas de hoy no cambia nada. Puede que igual cambie mañana, con otras
          licitaciones.
        </p>
      ) : (
        <>
          {c.salenRevisadas > 0 && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
              {c.salenRevisadas === 1
                ? "Una de las que salen ya fue revisada por el equipo."
                : `${c.salenRevisadas} de las que salen ya fueron revisadas por el equipo.`}{" "}
              No se borran del tablero, pero el radar dejaría de traer licitaciones como esas.
            </p>
          )}
          {/* Dos columnas solo si hay algo en las dos: con una sola lista, media
              pantalla vacia al lado se lee como si faltara contenido. */}
          <div
            className={`mt-4 grid gap-4 ${
              c.totalEntran > 0 && c.totalSalen > 0 ? "md:grid-cols-2" : ""
            }`}
          >
            <Lista titulo="Dejarían de entrar" filas={c.salen} total={c.totalSalen} tono="sale" />
            <Lista titulo="Entrarían" filas={c.entran} total={c.totalEntran} tono="entra" />
          </div>
        </>
      )}
    </div>
  );
}
