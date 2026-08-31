/**
 * Desplegable propio.
 *
 * El `<select>` nativo dibuja su lista con el motor del sistema operativo y CSS
 * no la alcanza: queda con el aspecto por defecto del navegador, distinto en
 * cada equipo y ajeno al resto de la interfaz.
 *
 * Lo que hay que reponer al reemplazarlo es lo que el nativo daba gratis:
 * navegacion con teclado, anuncio a lectores de pantalla, cierre al salir y un
 * `<input>` oculto para que siga funcionando dentro de un formulario.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface OpcionSelect {
  valor: string;
  etiqueta: string;
  /** Cifra al costado, como el conteo de un filtro. */
  detalle?: string;
}

export function Select({
  opciones,
  valor,
  onChange,
  name,
  etiquetaAccesible,
  className = "",
}: {
  opciones: OpcionSelect[];
  valor: string;
  onChange: (valor: string) => void;
  /** Si se pasa, se emite un input oculto con este nombre para enviarlo en un form. */
  name?: string;
  etiquetaAccesible: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(() =>
    Math.max(0, opciones.findIndex((o) => o.valor === valor)),
  );
  const contenedor = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();

  const seleccionada = opciones.find((o) => o.valor === valor) ?? opciones[0];

  // Cerrar al hacer clic fuera o al perder el foco: sin esto el panel queda
  // abierto encima del contenido y hay que volver a hacer clic en el boton.
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  // Mantener a la vista la opcion resaltada al moverse con las flechas.
  useEffect(() => {
    if (!abierto) return;
    const el = lista.current?.children[resaltada] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [abierto, resaltada]);

  function elegir(v: string) {
    onChange(v);
    setAbierto(false);
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setAbierto(false);
      return;
    }
    if (!abierto && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setResaltada(Math.max(0, opciones.findIndex((o) => o.valor === valor)));
      setAbierto(true);
      return;
    }
    if (!abierto) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltada((i) => (i + 1) % opciones.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltada((i) => (i - 1 + opciones.length) % opciones.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setResaltada(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setResaltada(opciones.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elegir(opciones[resaltada].valor);
    }
  }

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={valor} />}

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-label={etiquetaAccesible}
        onClick={() => {
          setResaltada(Math.max(0, opciones.findIndex((o) => o.valor === valor)));
          setAbierto((a) => !a);
        }}
        onKeyDown={teclado}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm text-neutral-800 transition-colors hover:border-neutral-400 focus:border-[#1c2f4a] focus:outline-none focus:ring-2 focus:ring-[#1c2f4a]/15"
      >
        <span className="truncate">{seleccionada?.etiqueta}</span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`size-3 shrink-0 text-neutral-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          aria-label={etiquetaAccesible}
          tabIndex={-1}
          onKeyDown={teclado}
          className="absolute z-20 mt-1 max-h-72 w-full min-w-max overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {opciones.map((o, i) => {
            const activa = o.valor === valor;
            return (
              <li
                key={o.valor}
                role="option"
                aria-selected={activa}
                onClick={() => elegir(o.valor)}
                onMouseEnter={() => setResaltada(i)}
                className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-1.5 text-sm ${
                  i === resaltada ? "bg-neutral-100" : ""
                } ${activa ? "font-medium text-[#1c2f4a]" : "text-neutral-700"}`}
              >
                <span className="flex items-center gap-2">
                  {/* Marca la elegida sin depender solo del color. */}
                  <span className={`w-3 shrink-0 text-[#1c2f4a] ${activa ? "" : "opacity-0"}`}>✓</span>
                  {o.etiqueta}
                </span>
                {o.detalle && (
                  <span className="font-mono text-xs tabular-nums text-neutral-400">{o.detalle}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
