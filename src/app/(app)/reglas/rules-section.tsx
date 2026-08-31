/**
 * Un tipo de regla y sus filas (RF-09).
 *
 * Una regla es una expresion regular, y una expresion regular no es texto: es
 * notacion. `desarrollo (de )?(sistema|software)` no se lee, se descifra, y
 * quien revisa estas reglas no tiene por que descifrar nada.
 *
 * Se muestra en palabras —"desarrollo de sistema o software"—, una etiqueta por
 * cosa que la regla busca. Es un resumen y como tal pierde matices, asi que la
 * expresion exacta esta a un clic, en «Editar», y es la que el motor evalua.
 *
 * Cada fila se edita en su lugar. Abrir una ventana encima obligaria a recordar
 * las otras reglas de memoria, y casi siempre se edita una comparandola con la
 * de arriba.
 */
"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/select";
import type { Comparacion } from "@/lib/affinity/preview";
import { COMPRADORES_VALIDOS, VERTICALES_VALIDAS } from "@/lib/affinity/validate";
import { frasesDe, TIPOS_REGLA } from "@/lib/rule-kinds";
import { nombreComprador, nombreVertical } from "@/lib/tenders";
import {
  alternarRegla,
  eliminarRegla,
  guardarRegla,
  moverRegla,
  probar,
  type Resultado,
} from "./actions";
import { PreviewResult } from "./preview-result";

export interface ReglaVista {
  id: string;
  kind: string;
  pattern: string;
  weight: number;
  vertical: string | null;
  buyerType: string | null;
  active: boolean;
  updatedBy: string | null;
}

const claseBotonChico =
  "rounded px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40";

/** Formulario de una regla, se use para crear o para editar. */
function Editor({
  kind,
  regla,
  onCerrar,
}: {
  kind: string;
  regla?: ReglaVista;
  onCerrar: () => void;
}) {
  const meta = TIPOS_REGLA[kind];
  const [pattern, setPattern] = useState(regla?.pattern ?? "");
  const [weight, setWeight] = useState(
    String(regla?.weight ?? (kind === "KEYWORD" ? 4 : kind === "EXCLUSION" ? -6 : 0)),
  );
  const [vertical, setVertical] = useState(regla?.vertical ?? "WEB_DEVELOPMENT");
  const [buyerType, setBuyerType] = useState(regla?.buyerType ?? "PUBLIC_SERVICE");

  const [errores, setErrores] = useState<Resultado["errores"]>({});
  const [previa, setPrevia] = useState<Comparacion | null>(null);
  const [trabajando, empezar] = useTransition();

  const borrador = () => ({
    id: regla?.id,
    kind,
    pattern,
    weight: Number(weight),
    vertical: meta.destino === "vertical" ? (vertical as never) : null,
    buyerType: meta.destino === "buyerType" ? (buyerType as never) : null,
  });

  function probarCambio() {
    setErrores({});
    empezar(async () => {
      const r = await probar({ regla: borrador() });
      if (r.ok && r.comparacion) setPrevia(r.comparacion);
      else {
        setPrevia(null);
        setErrores(r.errores ?? { general: "No se pudo calcular." });
      }
    });
  }

  function guardar() {
    setErrores({});
    empezar(async () => {
      const fd = new FormData();
      if (regla?.id) fd.set("id", regla.id);
      fd.set("kind", kind);
      fd.set("pattern", pattern);
      fd.set("weight", weight);
      if (meta.destino === "vertical") fd.set("vertical", vertical);
      if (meta.destino === "buyerType") fd.set("buyerType", buyerType);

      const r = await guardarRegla({ ok: false }, fd);
      if (r.ok) onCerrar();
      else setErrores(r.errores ?? { general: "No se pudo guardar." });
    });
  }

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-3">
      <label className="block text-[11px] font-medium text-neutral-600" htmlFor={`p-${regla?.id ?? "nueva"}`}>
        Expresión regular, en minúsculas y sin tildes
      </label>
      <textarea
        id={`p-${regla?.id ?? "nueva"}`}
        value={pattern}
        onChange={(e) => setPattern(e.target.value)}
        rows={3}
        spellCheck={false}
        autoFocus
        placeholder="gestion documental|archivo digital"
        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2.5 py-2 font-mono text-xs leading-relaxed text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
      />
      {errores?.pattern && <p className="mt-1 text-[11px] text-red-700">{errores.pattern}</p>}
      <p className="mt-1 text-[11px] text-neutral-500">
        Alternativas con <code className="font-mono">|</code>, opcional con{" "}
        <code className="font-mono">?</code>, límite de palabra con{" "}
        <code className="font-mono">\b</code>.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {meta.peso && (
          <div>
            <label className="block text-[11px] font-medium text-neutral-600" htmlFor={`w-${regla?.id ?? "nueva"}`}>
              Peso
            </label>
            <input
              id={`w-${regla?.id ?? "nueva"}`}
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-1 w-20 rounded-md border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm tabular-nums text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
            />
          </div>
        )}

        {meta.destino === "vertical" && (
          <div>
            <span className="block text-[11px] font-medium text-neutral-600">Vertical que asigna</span>
            <Select
              className="mt-1 w-56"
              etiquetaAccesible="Vertical que asigna la regla"
              valor={vertical}
              onChange={setVertical}
              opciones={VERTICALES_VALIDAS.map((v) => ({ valor: v, etiqueta: nombreVertical(v) }))}
            />
          </div>
        )}

        {meta.destino === "buyerType" && (
          <div>
            <span className="block text-[11px] font-medium text-neutral-600">Comprador que asigna</span>
            <Select
              className="mt-1 w-56"
              etiquetaAccesible="Tipo de comprador que asigna la regla"
              valor={buyerType}
              onChange={setBuyerType}
              opciones={COMPRADORES_VALIDOS.map((b) => ({ valor: b, etiqueta: nombreComprador(b) }))}
            />
          </div>
        )}
      </div>

      {errores?.weight && <p className="mt-2 text-[11px] text-red-700">{errores.weight}</p>}
      {errores?.vertical && <p className="mt-2 text-[11px] text-red-700">{errores.vertical}</p>}
      {errores?.buyerType && <p className="mt-2 text-[11px] text-red-700">{errores.buyerType}</p>}
      {errores?.general && <p className="mt-2 text-[11px] text-red-700">{errores.general}</p>}

      {previa && (
        <div className="mt-3">
          <PreviewResult c={previa} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={trabajando}
          className="rounded-md bg-[#1c2f4a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#16253b] disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={probarCambio}
          disabled={trabajando}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {trabajando ? "Calculando…" : "Probar este cambio"}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-md px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * Lo que busca una regla, escrito en palabras.
 *
 * Sin monoespaciada: es una lista de cosas, no codigo, y la monoespaciada
 * invita a leerla como si lo fuera.
 */
function Terminos({ patron, activa }: { patron: string; activa: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {frasesDe(patron).map((frase, i) => (
        <span
          key={`${i}-${frase}`}
          className={`rounded px-2 py-0.5 text-xs leading-relaxed ${
            activa ? "bg-neutral-100 text-neutral-700" : "bg-neutral-100/60 text-neutral-400"
          }`}
        >
          {frase}
        </span>
      ))}
    </div>
  );
}

function Fila({
  regla,
  primera,
  ultima,
  editando,
  onEditar,
  onCerrar,
}: {
  regla: ReglaVista;
  primera: boolean;
  ultima: boolean;
  editando: boolean;
  onEditar: () => void;
  onCerrar: () => void;
}) {
  const meta = TIPOS_REGLA[regla.kind];
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, empezar] = useTransition();

  const destino =
    meta.destino === "vertical"
      ? nombreVertical(regla.vertical ?? "")
      : meta.destino === "buyerType"
        ? nombreComprador(regla.buyerType ?? "")
        : null;

  return (
    <li className={regla.active ? "" : "bg-neutral-50/60"}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        {meta.orden && (
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              aria-label="Subir"
              title="Evaluar antes"
              disabled={primera || trabajando}
              onClick={() => empezar(async () => void (await moverRegla(regla.id, "arriba")))}
              className="rounded px-1 text-[10px] leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-25"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label="Bajar"
              title="Evaluar después"
              disabled={ultima || trabajando}
              onClick={() => empezar(async () => void (await moverRegla(regla.id, "abajo")))}
              className="rounded px-1 text-[10px] leading-none text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-25"
            >
              ▼
            </button>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Terminos patron={regla.pattern} activa={regla.active} />
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-neutral-500">
            {destino && <span>{destino}</span>}
            {!regla.active && <span className="font-medium text-neutral-500">desactivada</span>}
            {regla.updatedBy && regla.updatedBy !== "seed" && <span>editada por {regla.updatedBy}</span>}
          </p>
        </div>

        {meta.peso && (
          <span
            className={`shrink-0 font-mono text-sm tabular-nums ${
              regla.weight < 0 ? "text-red-700" : "text-neutral-700"
            }`}
          >
            {regla.weight > 0 ? `+${regla.weight}` : regla.weight}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {confirmando ? (
            <>
              <span className="mr-1 text-[11px] text-neutral-600">¿Eliminar?</span>
              <button
                type="button"
                disabled={trabajando}
                onClick={() => empezar(async () => void (await eliminarRegla(regla.id)))}
                className="rounded px-2 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className={claseBotonChico}
              >
                No
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={trabajando}
                onClick={() => empezar(async () => void (await alternarRegla(regla.id)))}
                className={claseBotonChico}
              >
                {regla.active ? "Desactivar" : "Activar"}
              </button>
              <button
                type="button"
                onClick={editando ? onCerrar : onEditar}
                className={claseBotonChico}
              >
                {editando ? "Cerrar" : "Editar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className={claseBotonChico}
              >
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      {editando && <Editor kind={regla.kind} regla={regla} onCerrar={onCerrar} />}
    </li>
  );
}

export function RulesSection({ kind, reglas }: { kind: string; reglas: ReglaVista[] }) {
  const meta = TIPOS_REGLA[kind];
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const activas = reglas.filter((r) => r.active).length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-neutral-900">{meta.titulo}</h2>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-400">
          {activas === reglas.length ? `${reglas.length}` : `${activas} de ${reglas.length}`} activas
        </span>
      </div>
      <p className="mb-3 max-w-3xl text-xs leading-relaxed text-neutral-500">{meta.descripcion}</p>

      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {reglas.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-neutral-500">
            No hay reglas de este tipo.
          </li>
        )}
        {reglas.map((r, i) => (
          <Fila
            key={r.id}
            regla={r}
            primera={i === 0}
            ultima={i === reglas.length - 1}
            editando={editando === r.id}
            onEditar={() => {
              setCreando(false);
              setEditando(r.id);
            }}
            onCerrar={() => setEditando(null)}
          />
        ))}
        {creando && (
          <li>
            <Editor kind={kind} onCerrar={() => setCreando(false)} />
          </li>
        )}
      </ul>

      {!creando && (
        <button
          type="button"
          onClick={() => {
            setEditando(null);
            setCreando(true);
          }}
          className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-white hover:text-neutral-900"
        >
          {meta.agregar}
        </button>
      )}
    </section>
  );
}
