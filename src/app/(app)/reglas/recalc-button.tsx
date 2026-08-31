/**
 * Volver a puntuar el tablero con las reglas de ahora (RF-09).
 *
 * Va aparte de los botones de guardar porque hace algo distinto: guardar cambia
 * lo que el radar traera; esto cambia lo que ya esta en la lista. El barrido no
 * lo hace solo —una licitacion que ya existe solo se vuelve a mirar si cambio su
 * cierre (docs/05)—, asi que sin este boton editar una regla no se nota en el
 * tablero hasta que aparezca algo nuevo.
 */
"use client";

import { useState, useTransition } from "react";
import { recalcularGuardadas, type ResultadoRecalculo } from "./actions";

export function RecalcButton() {
  const [resultado, setResultado] = useState<ResultadoRecalculo | null>(null);
  const [trabajando, empezar] = useTransition();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-neutral-900">Aplicar al tablero</h2>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-neutral-500">
        Los cambios de arriba se aplican en el próximo barrido, que corre cada dos horas y decide qué
        licitaciones <em>nuevas</em> entran. Las que ya están en el tablero conservan el puntaje con
        el que entraron. Esto las vuelve a puntuar con las reglas de ahora, sin llamar a la API.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-500">
        No borra ninguna. Si alguna queda bajo el umbral se queda igual, con su puntaje nuevo: un
        cambio de regla no deshace lo que el equipo ya revisó.
      </p>

      {resultado?.ok && (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {resultado.mensaje}
          {typeof resultado.bajoUmbral === "number" && resultado.bajoUmbral > 0 && (
            <>
              {" "}
              {resultado.bajoUmbral}{" "}
              {resultado.bajoUmbral === 1
                ? "quedó bajo el umbral y sigue en el tablero."
                : "quedaron bajo el umbral y siguen en el tablero."}
            </>
          )}
        </p>
      )}
      {resultado && !resultado.ok && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {resultado.errores?.general ?? "No se pudo recalcular."}
        </p>
      )}

      <button
        type="button"
        disabled={trabajando}
        onClick={() => empezar(async () => setResultado(await recalcularGuardadas()))}
        className="mt-4 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
      >
        {trabajando ? "Recalculando…" : "Recalcular el tablero"}
      </button>
    </div>
  );
}
