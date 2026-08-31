/**
 * Estrella para marcar una favorita.
 *
 * Responde al instante y corrige si el servidor falla: esperar la ida y vuelta
 * para pintar una estrella hace sentir la tabla lenta cuando se marcan varias
 * seguidas.
 */
"use client";

import { useState, useTransition } from "react";
import { alternarFavorita } from "./favoritas-actions";

export function StarButton({
  code,
  favorita: inicial,
  className = "",
}: {
  code: string;
  favorita: boolean;
  className?: string;
}) {
  const [favorita, setFavorita] = useState(inicial);
  const [pendiente, empezar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      aria-pressed={favorita}
      aria-label={favorita ? "Quitar de favoritas" : "Marcar como favorita"}
      title={favorita ? "Quitar de favoritas" : "Marcar como favorita"}
      onClick={() => {
        const siguiente = !favorita;
        setFavorita(siguiente);
        empezar(async () => {
          const r = await alternarFavorita(code);
          // Si el servidor dijo otra cosa, manda el servidor.
          if (!r.ok) setFavorita(!siguiente);
          else if (typeof r.favorita === "boolean") setFavorita(r.favorita);
        });
      }}
      className={`rounded p-1 transition-colors hover:bg-neutral-100 disabled:opacity-50 ${className}`}
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className={`size-4 transition-colors ${
          favorita ? "fill-amber-400 text-amber-500" : "fill-none text-neutral-300 hover:text-neutral-400"
        }`}
      >
        <path
          d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.48l-4.7 2.47.9-5.23-3.8-3.7 5.25-.76z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
