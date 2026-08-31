/**
 * Boton de traer una vista al tablero (D-32).
 *
 * El resultado se muestra al lado del boton, no en un aviso flotante: quien
 * revisa la lista esta recorriendo filas y el mensaje debe quedar donde estaba
 * mirando. Si la accion crea la licitacion, el boton se vuelve un enlace a la
 * ficha, que es lo unico que tiene sentido hacer despues.
 */
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { traerAlTablero, type ResultadoTraer } from "./actions";

export function PullButton({ code }: { code: string }) {
  const [resultado, setResultado] = useState<ResultadoTraer | null>(null);
  const [trabajando, empezar] = useTransition();

  if (resultado?.ok) {
    return (
      <span className="flex flex-col items-end gap-0.5">
        <Link
          href={`/licitaciones/${encodeURIComponent(code)}?volver=%2Fvistas`}
          className="whitespace-nowrap rounded-md bg-[#1c2f4a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#16253b]"
        >
          Ver ficha
        </Link>
        {resultado.mensaje && (
          <span className="max-w-56 text-right text-[11px] leading-snug text-emerald-800">
            {resultado.mensaje}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        disabled={trabajando}
        onClick={() => empezar(async () => setResultado(await traerAlTablero(code)))}
        className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
      >
        {trabajando ? "Pidiendo la ficha…" : "Traer al tablero"}
      </button>
      {resultado?.error && (
        <span className="max-w-56 text-right text-[11px] leading-snug text-red-700">
          {resultado.error}
        </span>
      )}
    </span>
  );
}
