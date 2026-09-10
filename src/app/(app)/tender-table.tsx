/**
 * Tabla de licitaciones, compartida por el tablero y las favoritas.
 *
 * Esta aparte para que las dos pantallas sean identicas por construccion y no
 * por haberlas copiado: si cada una tuviera su propia tabla, terminarian
 * mostrando cosas distintas del mismo dato en cuanto se toque una.
 *
 * Las cabeceras ordenables son opcionales: el tablero ordena por columna, las
 * favoritas van siempre por cierre.
 */
import Link from "next/link";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { ESTADOS } from "@/lib/reviews";
import { colorPlazo, diasPara, nombreVertical, textoPlazo } from "@/lib/tenders";
import { StarButton } from "./star-button";

export interface FilaLicitacion {
  code: string;
  name: string;
  buyerOrganism: string;
  region: string;
  closesAt: Date | null;
  estimatedAmount: unknown;
  currency: string;
  affinityScore: number;
  reviewStatus: ReviewStatus;
  vertical: string;
  outOfScale: boolean;
  incumbentSignals: string[];
  opportunitySignals: string[];
}

const monto = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fechaCorta = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "numeric",
  month: "short",
});

export interface ColumnaOrdenable {
  clave: string;
  href: string;
  activa: boolean;
  dir: "asc" | "desc";
}

export function TenderTable({
  filas,
  favoritas,
  volver,
  ordenables,
  vacio = "No hay licitaciones con estos filtros.",
}: {
  filas: FilaLicitacion[];
  /** Codigos que el perfil activo marco como favoritas (D-26). */
  favoritas: Set<string>;
  /** A donde vuelve la ficha. Sin esto se pierde el filtro al volver. */
  volver?: string;
  /** Si se pasa, las cabeceras de monto, afinidad y cierre son enlaces de orden. */
  ordenables?: Record<string, ColumnaOrdenable>;
  vacio?: string;
}) {
  const enlaceFicha = (code: string) => {
    const base = `/licitaciones/${encodeURIComponent(code)}`;
    return volver ? `${base}?volver=${encodeURIComponent(volver)}` : base;
  };

  const cabeceras: Array<[string, string | null, boolean]> = [
    ["Estado", null, false],
    ["Licitación", null, false],
    ["Vertical", null, false],
    ["Monto", "monto", true],
    ["Afinidad", "afinidad", true],
    ["Cierre", "cierre", true],
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50/70">
            <th scope="col" className="w-9 px-2 py-2.5">
              <span className="sr-only">Favorita</span>
            </th>
            {cabeceras.map(([etiqueta, clave, derecha]) => {
              const orden = clave ? ordenables?.[clave] : undefined;
              return (
                <th
                  key={etiqueta}
                  scope="col"
                  className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-500 ${
                    derecha ? "text-right" : "text-left"
                  }`}
                >
                  {orden ? (
                    <Link href={orden.href} className="inline-flex items-center gap-1 hover:text-neutral-900">
                      {etiqueta}
                      {orden.activa && (
                        <span aria-hidden className="text-[9px]">
                          {orden.dir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    etiqueta
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-12 text-center text-sm text-neutral-500">
                {vacio}
              </td>
            </tr>
          )}
          {filas.map((t) => {
            const d = diasPara(t.closesAt);
            return (
              <tr key={t.code} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-2 py-2 align-top">
                  <StarButton code={t.code} favorita={favoritas.has(t.code)} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <span
                    className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${ESTADOS[t.reviewStatus].color}`}
                  >
                    {ESTADOS[t.reviewStatus].etiqueta}
                  </span>
                </td>
                <td className="max-w-md px-3 py-2.5 align-top">
                  <Link
                    href={enlaceFicha(t.code)}
                    className="line-clamp-2 font-medium text-neutral-900 hover:text-[#1c2f4a] hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    <span className="font-mono">{t.code}</span>
                    {" · "}
                    {t.buyerOrganism}
                    {t.region ? ` · ${t.region}` : ""}
                  </p>
                  {t.incumbentSignals.length > 0 && (
                    <p className="mt-1 text-[11px] text-amber-700">posible proveedor instalado</p>
                  )}
                  {t.opportunitySignals.length > 0 && (
                    <p className="mt-1 text-[11px] text-emerald-700">
                      oportunidad · {t.opportunitySignals.join(" · ")}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top text-xs text-neutral-600">
                  {nombreVertical(t.vertical)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-700">
                  {t.estimatedAmount ? (
                    <>
                      {monto.format(Number(t.estimatedAmount))}
                      {t.currency !== "CLP" && <span className="ml-1 text-neutral-400">{t.currency}</span>}
                      {t.outOfScale && (
                        <span className="ml-1 text-neutral-400" title="Fuera de escala">
                          ↑
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-neutral-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono text-xs tabular-nums text-neutral-700">
                  {t.affinityScore}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right align-top">
                  <span className={`block font-mono text-xs font-semibold tabular-nums ${colorPlazo(d)}`}>
                    {textoPlazo(d)}
                  </span>
                  {t.closesAt && (
                    <span className="block font-mono text-[11px] tabular-nums text-neutral-400">
                      {fechaCorta.format(t.closesAt)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
