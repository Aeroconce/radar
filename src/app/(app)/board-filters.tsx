/**
 * Busqueda y filtros del tablero (RF-04).
 *
 * Todo el estado vive en la URL, no en React: asi un filtro se comparte pegando
 * el enlace, el boton de atras funciona, y la pagina se puede renderizar en el
 * servidor sin hidratar una tabla entera.
 *
 * La busqueda espera 300 ms antes de navegar; sin eso cada tecla seria una
 * consulta a la base.
 *
 * Los desplegables muestran solo lo que existe, con su conteo: quince regiones
 * vacias son ruido; las cuatro con filas, un mapa.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { ESTADOS, ORDEN_ESTADOS } from "@/lib/reviews";
import { TRAMOS_MONTO } from "@/lib/tenders";
import { Select } from "@/components/select";

export interface ConteoEstado {
  estado: ReviewStatus;
  total: number;
}

export interface OpcionFaceta {
  valor: string;
  etiqueta: string;
  total: number;
}

export interface Facetas {
  verticales: OpcionFaceta[];
  compradores: OpcionFaceta[];
  procesos: OpcionFaceta[];
  regiones: OpcionFaceta[];
}

function opciones(todas: string, lista: OpcionFaceta[]) {
  return [
    { valor: "", etiqueta: todas },
    ...lista.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta, detalle: String(o.total) })),
  ];
}

export function BoardFilters({
  conteos,
  facetas,
  consulta,
}: {
  conteos: ConteoEstado[];
  facetas: Facetas;
  /** La query actual, para que la exportacion baje exactamente lo filtrado (RF-11). */
  consulta: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [texto, setTexto] = useState(params.get("q") ?? "");
  const primeraCarga = useRef(true);

  const estadosActivos = (params.get("estado") ?? "").split(",").filter(Boolean);
  const activa = (clave: string) => params.get(clave) ?? "";

  function navegar(cambios: Record<string, string | null>) {
    const siguiente = new URLSearchParams(params.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === "") siguiente.delete(clave);
      else siguiente.set(clave, valor);
    }
    // Cualquier cambio de filtro vuelve a la primera pagina: quedarse en la 3
    // de un resultado que ahora tiene una sola pagina muestra una tabla vacia.
    siguiente.delete("pagina");
    router.push(`${pathname}?${siguiente.toString()}`);
  }

  // Espera antes de consultar. La primera vuelta se salta para no navegar
  // apenas monta el componente.
  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    const t = setTimeout(() => navegar({ q: texto || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  function alternarEstado(estado: string) {
    const siguiente = estadosActivos.includes(estado)
      ? estadosActivos.filter((e) => e !== estado)
      : [...estadosActivos, estado];
    navegar({ estado: siguiente.join(",") || null });
  }

  const hayFiltros =
    estadosActivos.length > 0 ||
    texto !== "" ||
    ["vertical", "comprador", "proceso", "region", "monto", "bajoumbral"].some((c) => activa(c) !== "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
            placeholder="Buscar por nombre, organismo, código o descripción…"
            aria-label="Buscar licitaciones"
            className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
          />
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setTexto("");
              router.push(pathname);
            }}
            className="rounded-md px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            Limpiar
          </button>
        )}

        {/*
          La exportacion baja lo que el tablero muestra, con los filtros
          puestos (RF-11). Un enlace y no un boton con estado: el archivo lo
          arma el servidor y el navegador lo descarga.
        */}
        <a
          href={consulta ? `/api/export?${consulta}` : "/api/export"}
          download
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Exportar a Excel
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-52"
          etiquetaAccesible="Filtrar por vertical"
          valor={activa("vertical")}
          onChange={(v) => navegar({ vertical: v || null })}
          opciones={opciones("Todas las verticales", facetas.verticales)}
        />
        <Select
          className="w-52"
          etiquetaAccesible="Filtrar por tipo de comprador"
          valor={activa("comprador")}
          onChange={(v) => navegar({ comprador: v || null })}
          opciones={opciones("Todos los compradores", facetas.compradores)}
        />
        <Select
          className="w-56"
          etiquetaAccesible="Filtrar por tipo de proceso"
          valor={activa("proceso")}
          onChange={(v) => navegar({ proceso: v || null })}
          opciones={opciones("Todos los procesos", facetas.procesos)}
        />
        <Select
          className="w-52"
          etiquetaAccesible="Filtrar por región"
          valor={activa("region")}
          onChange={(v) => navegar({ region: v || null })}
          opciones={opciones("Todas las regiones", facetas.regiones)}
        />
        <Select
          className="w-48"
          etiquetaAccesible="Filtrar por monto"
          valor={activa("monto")}
          onChange={(v) => navegar({ monto: v || null })}
          opciones={[
            { valor: "", etiqueta: "Cualquier monto" },
            ...TRAMOS_MONTO.map((t) => ({ valor: t.clave, etiqueta: t.etiqueta })),
          ]}
        />
        {/* Las que estan bajo el umbral se ocultan por defecto (D-42, D-46):
            entraron con reglas viejas y con las de hoy no entrarian. La casilla
            las trae de vuelta sin cambiarles el estado. */}
        <label className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md px-2 py-2 text-xs text-neutral-600 hover:bg-neutral-100">
          <input
            type="checkbox"
            checked={activa("bajoumbral") === "1"}
            onChange={(e) => navegar({ bajoumbral: e.target.checked ? "1" : null })}
            className="h-3.5 w-3.5 accent-[#1c2f4a]"
          />
          Mostrar bajo el umbral
        </label>
      </div>

      {/* Los conteos son los filtros: mostrarlos como cifras sueltas obliga a
          tener otro control aparte para lo mismo. */}
      <div className="flex flex-wrap gap-1.5">
        {ORDEN_ESTADOS.map((estado) => {
          const conteo = conteos.find((c) => c.estado === estado)?.total ?? 0;
          if (conteo === 0) return null;
          const activo = estadosActivos.includes(estado);
          return (
            <button
              key={estado}
              type="button"
              onClick={() => alternarEstado(estado)}
              aria-pressed={activo}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                activo
                  ? "bg-[#1c2f4a] text-white ring-[#1c2f4a]"
                  : `${ESTADOS[estado].color} hover:brightness-95`
              }`}
            >
              {ESTADOS[estado].etiqueta}
              <span className="font-mono tabular-nums opacity-70">{conteo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
