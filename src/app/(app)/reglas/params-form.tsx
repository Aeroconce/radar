/**
 * Parametros del motor (RF-09, docs/04).
 *
 * Son ocho numeros que cambian cuantas licitaciones ve el equipo cada dia, asi
 * que cada uno lleva escrito al lado que hace. Un campo llamado "umbral" sin mas
 * es una perilla a ciegas.
 *
 * El boton de probar manda los valores del formulario sin guardarlos: se ve el
 * efecto antes de comprometerlo (docs/04, "Guardar exige confirmar").
 */
"use client";

import { useActionState, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { Comparacion } from "@/lib/affinity/preview";
import { TIPOS_PROCESO_VALIDOS } from "@/lib/affinity/validate";
import { nombreProceso } from "@/lib/tenders";
import { guardarParametros, probar, type Resultado } from "./actions";
import { PreviewResult } from "./preview-result";

const INICIAL: Resultado = { ok: false };

const monto = new Intl.NumberFormat("es-CL");

/** Posicion del cursor tras `digitos` cifras del texto, saltandose los puntos. */
function posicionTras(texto: string, digitos: number): number {
  let vistos = 0;
  let i = 0;
  for (; i < texto.length && vistos < digitos; i++) {
    if (/\d/.test(texto[i])) vistos++;
  }
  return i;
}

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1">
      <label className="block text-xs font-medium text-neutral-700">{etiqueta}</label>
      {children}
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">{ayuda}</p>
    </div>
  );
}

const claseNumero =
  "mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 font-mono text-sm tabular-nums text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15";

export function ParamsForm({
  inicial,
}: {
  inicial: {
    affinityThreshold: number;
    highAffinityThreshold: number;
    maxAmount: number;
    processTypes: string[];
    canonMin: number;
    canonMax: number;
    lrPenalty: number;
    noSoftwareItemPenalty: number;
  };
}) {
  const [umbral, setUmbral] = useState(String(inicial.affinityThreshold));
  const [aviso, setAviso] = useState(String(inicial.highAffinityThreshold));
  const [maximo, setMaximo] = useState(String(inicial.maxAmount));
  const [procesos, setProcesos] = useState<string[]>(inicial.processTypes);
  const [canonMin, setCanonMin] = useState(String(inicial.canonMin));
  const [canonMax, setCanonMax] = useState(String(inicial.canonMax));
  const [restaLr, setRestaLr] = useState(String(inicial.lrPenalty));
  const [restaSinSoftware, setRestaSinSoftware] = useState(String(inicial.noSoftwareItemPenalty));

  const [state, formAction, guardando] = useActionState(guardarParametros, INICIAL);
  const [previa, setPrevia] = useState<Comparacion | null>(null);
  const [errorPrueba, setErrorPrueba] = useState<string | null>(null);
  const [probando, empezar] = useTransition();

  const campoMaximo = useRef<HTMLInputElement>(null);
  const cifrasAntesDelCursor = useRef<number | null>(null);

  /*
   * Reponer el cursor despues de formatear.
   *
   * Al reescribir el valor con puntos, el navegador manda el cursor al final: si
   * alguien entra a corregir un digito del medio, el siguiente que escriba
   * aparece al otro extremo del numero. Se guarda cuantas cifras habia a la
   * izquierda y se vuelve a esa cifra, ya con los puntos puestos.
   */
  useLayoutEffect(() => {
    const el = campoMaximo.current;
    if (cifrasAntesDelCursor.current === null || !el) return;
    const objetivo = cifrasAntesDelCursor.current;
    cifrasAntesDelCursor.current = null;
    const i = posicionTras(el.value, objetivo);
    el.setSelectionRange(i, i);
  });

  function cambiarMaximo(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const hastaElCursor = el.value.slice(0, el.selectionStart ?? el.value.length);
    cifrasAntesDelCursor.current = hastaElCursor.replace(/\D/g, "").length;
    setMaximo(el.value.replace(/\D/g, ""));
  }

  function alternarProceso(t: string) {
    setProcesos((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  }

  function probarCambio() {
    setErrorPrueba(null);
    empezar(async () => {
      const r = await probar({
        parametros: {
          affinityThreshold: Number(umbral),
          highAffinityThreshold: Number(aviso),
          maxAmount: Number(maximo),
          processTypes: procesos,
          canonMin: Number(canonMin),
          canonMax: Number(canonMax),
          lrPenalty: Number(restaLr),
          noSoftwareItemPenalty: Number(restaSinSoftware),
        },
      });
      if (r.ok && r.comparacion) setPrevia(r.comparacion);
      else {
        setPrevia(null);
        setErrorPrueba(r.errores?.general ?? "No se pudo calcular.");
      }
    });
  }

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Campo
          etiqueta="Umbral de selección"
          ayuda="Puntaje mínimo para entrar al tablero. Más bajo, más licitaciones y más ruido."
        >
          <input
            type="number"
            name="affinityThreshold"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
            min={1}
            className={claseNumero}
          />
        </Campo>

        <Campo
          etiqueta="Umbral de aviso"
          ayuda="Desde este puntaje, una licitación nueva dispara un correo."
        >
          <input
            type="number"
            name="highAffinityThreshold"
            value={aviso}
            onChange={(e) => setAviso(e.target.value)}
            min={1}
            className={claseNumero}
          />
        </Campo>

        <Campo
          etiqueta="Monto máximo"
          ayuda={`Sobre ${monto.format(Number(maximo) || 0)} se marca «fuera de escala»: se lista igual, con dos puntos menos.`}
        >
          {/* Texto y no `number`: el navegador rechaza un valor con puntos, asi
              que con `number` no hay forma de mostrar el separador de miles.
              Al formulario viaja el campo oculto, con las cifras solas. */}
          <input
            ref={campoMaximo}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Monto máximo"
            value={maximo ? monto.format(Number(maximo)) : ""}
            onChange={cambiarMaximo}
            className={claseNumero}
          />
          <input type="hidden" name="maxAmount" value={maximo} />
        </Campo>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-medium text-neutral-700">Tipos de proceso</legend>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Solo se seleccionan licitaciones de estos tipos.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TIPOS_PROCESO_VALIDOS.map((t) => {
            const activo = procesos.includes(t);
            return (
              <label
                key={t}
                className={`cursor-pointer select-none rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                  activo
                    ? "bg-[#1c2f4a] text-white ring-[#1c2f4a]"
                    : "bg-white text-neutral-600 ring-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="processTypes"
                  value={t}
                  checked={activo}
                  onChange={() => alternarProceso(t)}
                  className="sr-only"
                />
                {nombreProceso(t)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-xs font-medium text-neutral-700">Señales de la ficha</legend>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Se suman al puntaje de texto cuando llega la ficha. La vista previa de reglas no las incluye: muestra
          solo lo que hacen las palabras.
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <Campo
            etiqueta="Canon mensual mínimo"
            ayuda={`Monto dividido en los meses del contrato. Entre ${monto.format(Number(canonMin) || 0)} y el máximo suma 2; fuera resta 2.`}
          >
            <input
              type="number"
              name="canonMin"
              value={canonMin}
              onChange={(e) => setCanonMin(e.target.value)}
              min={0}
              step={100000}
              className={claseNumero}
            />
          </Campo>
          <Campo
            etiqueta="Canon mensual máximo"
            ayuda={`Sobre ${monto.format(Number(canonMax) || 0)} al mes suele ser un ERP de incumbente o un sistema crítico.`}
          >
            <input
              type="number"
              name="canonMax"
              value={canonMax}
              onChange={(e) => setCanonMax(e.target.value)}
              min={1}
              step={100000}
              className={claseNumero}
            />
          </Campo>
          <Campo etiqueta="Resta por LR" ayuda="Sobre 5.000 UTM. Se resta y se etiqueta; no se descarta.">
            <input
              type="number"
              name="lrPenalty"
              value={restaLr}
              onChange={(e) => setRestaLr(e.target.value)}
              min={0}
              className={claseNumero}
            />
          </Campo>
          <Campo
            etiqueta="Resta sin ítem de software"
            ayuda="Cuando ningún ítem de la ficha es de software ni servicios informáticos."
          >
            <input
              type="number"
              name="noSoftwareItemPenalty"
              value={restaSinSoftware}
              onChange={(e) => setRestaSinSoftware(e.target.value)}
              min={0}
              className={claseNumero}
            />
          </Campo>
        </div>
      </fieldset>

      {state.errores?.general && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {state.errores.general}
        </p>
      )}
      {errorPrueba && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {errorPrueba}
        </p>
      )}
      {state.ok && state.mensaje && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {state.mensaje}
        </p>
      )}

      {previa && (
        <div className="mt-4">
          <PreviewResult c={previa} />
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-neutral-100 pt-4">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-[#1c2f4a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16253b] disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar parámetros"}
        </button>
        <button
          type="button"
          onClick={probarCambio}
          disabled={probando}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {probando ? "Calculando…" : "Probar con las activas de hoy"}
        </button>
      </div>
    </form>
  );
}
