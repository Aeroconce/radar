/**
 * Formulario de revision (RF-06, docs/07).
 *
 * Los motivos cambian segun el estado: descartar y viable piden cosas distintas,
 * y mostrar las veinte juntas obliga a leerlas todas cada vez.
 *
 * Cada uno lleva rotulo corto arriba y explicacion debajo. Con la frase completa
 * de docs/07 como unica etiqueta, catorce motivos en una columna angosta se
 * envolvian a tres lineas cada uno y formaban un muro imposible de escanear.
 *
 * La validacion se repite en el servidor (`guardarRevision`). Aqui es solo para
 * avisar antes de enviar; el servidor es el que decide.
 */
"use client";

import { useActionState, useState } from "react";
import type { ReviewStatus } from "@/generated/prisma/enums";
import {
  ESTADOS,
  EXIGEN_JUSTIFICACION,
  NOTA_MINIMA,
  ORDEN_ESTADOS,
  motivosPara,
} from "@/lib/reviews";
import { Select } from "@/components/select";
import { guardarRevision, type EstadoFormulario } from "./actions";

const INICIAL: EstadoFormulario = { ok: false };

export function ReviewForm({
  code,
  estadoActual,
  perfil,
}: {
  code: string;
  estadoActual: ReviewStatus;
  perfil: string | null;
}) {
  const [estado, setEstado] = useState<ReviewStatus>(estadoActual);
  const [nota, setNota] = useState("");
  const [state, formAction, pendiente] = useActionState(guardarRevision, INICIAL);

  const motivos = motivosPara(estado);
  const exigeJustificacion = EXIGEN_JUSTIFICACION.includes(estado);
  const faltanCaracteres = Math.max(0, NOTA_MINIMA - nota.trim().length);

  return (
    <form action={formAction} className="rounded-lg border border-neutral-200 bg-white p-5">
      <input type="hidden" name="code" value={code} />

      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h2 className="text-sm font-semibold text-neutral-900">Revisión</h2>
        {perfil && (
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#1c2f4a] text-[10px] font-semibold text-white">
              {perfil.charAt(0).toUpperCase()}
            </span>
            {perfil}
          </span>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-neutral-700">
          Estado
        </label>
        <div className="mt-1.5">
          <Select
            name="estado"
            etiquetaAccesible="Estado de la revisión"
            valor={estado}
            onChange={(v) => setEstado(v as ReviewStatus)}
            opciones={ORDEN_ESTADOS.map((e) => ({ valor: e, etiqueta: ESTADOS[e].etiqueta }))}
          />
        </div>
      </div>

      {motivos.length > 0 && (
        <fieldset className="mt-5">
          <legend className="flex w-full items-baseline justify-between text-sm font-medium text-neutral-700">
            <span>Motivos</span>
            {exigeJustificacion && (
              <span className="text-xs font-normal text-neutral-400">al menos uno</span>
            )}
          </legend>
          <div className="mt-2 -mx-1.5">
            {motivos.map((m) => (
              <label
                key={m.codigo}
                className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-neutral-50"
              >
                <input
                  type="checkbox"
                  name="motivos"
                  value={m.codigo}
                  className="mt-0.5 size-4 shrink-0 rounded border-neutral-300 accent-[#1c2f4a]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight text-neutral-800">
                    {m.rotulo}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-neutral-500">
                    {m.texto}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {state.errores?.motivos && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {state.errores.motivos}
            </p>
          )}
        </fieldset>
      )}

      <div className="mt-4">
        <label htmlFor="nota" className="block text-sm font-medium text-neutral-700">
          Por qué sí / por qué no
        </label>
        <textarea
          id="nota"
          name="nota"
          rows={5}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Qué encontraste en las bases y qué decidiste."
          className="mt-1.5 w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm leading-relaxed text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
        />
        {exigeJustificacion && faltanCaracteres > 0 && (
          <p className="mt-1.5 text-xs text-neutral-500">
            Faltan <span className="font-mono tabular-nums">{faltanCaracteres}</span> caracteres.
            Esta nota es la memoria de por qué se decidió esto.
          </p>
        )}
        {state.errores?.nota && (
          <p role="alert" className="mt-1.5 text-sm text-red-700">
            {state.errores.nota}
          </p>
        )}
      </div>

      {state.errores?.general && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.errores.general}
        </p>
      )}
      {state.ok && state.mensaje && (
        <p role="status" className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="mt-5 w-full rounded-md bg-[#1c2f4a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16253b] focus:outline-none focus:ring-2 focus:ring-[#1c2f4a]/40 disabled:opacity-60"
      >
        {pendiente ? "Guardando…" : "Guardar revisión"}
      </button>
    </form>
  );
}
