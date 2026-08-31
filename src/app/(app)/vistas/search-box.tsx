/**
 * Busqueda de la pantalla de vistas.
 *
 * Con envio explicito, no mientras se escribe: aca cada consulta recorre las
 * 4.700 filas con unaccent, y quien busca aqui viene con una pregunta armada,
 * no explorando.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBox({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(texto.trim() ? `/vistas?q=${encodeURIComponent(texto.trim())}` : "/vistas");
      }}
      className="flex gap-2"
    >
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoFocus
        placeholder="Buscar entre todas las activas vistas…"
        aria-label="Buscar entre todas las vistas"
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-[#1c2f4a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16253b]"
      >
        Buscar
      </button>
    </form>
  );
}
