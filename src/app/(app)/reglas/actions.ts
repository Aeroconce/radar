/**
 * Editar el motor de afinidad (RF-09, docs/04).
 *
 * Todo lo que se guarda aqui cambia que licitaciones ve el equipo manana, asi
 * que cada accion escribe en la bitacora con el perfil que la hizo (D-24) y
 * ninguna se aplica sin haber podido verse antes: `probar` calcula el efecto
 * sobre las activas de hoy **sin escribir nada**.
 *
 * RF-09 reserva esta pantalla al Administrador. Con una sola cuenta compartida
 * (D-22) ese rol no distingue a nadie: quien entra puede editar. Queda anotado
 * en docs/09 en vez de fingir un control que no existe.
 */
"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { BuyerType, Vertical } from "@/generated/prisma/enums";
import { comparar, type Candidata, type Comparacion } from "@/lib/affinity/preview";
import { RULE_KINDS, type Rule, type Thresholds } from "@/lib/affinity/rules";
import {
  validarParametros,
  validarRegla,
  type ParametrosEditables,
  type Problema,
  type ReglaEditable,
} from "@/lib/affinity/validate";
import { prisma } from "@/lib/db";
import { perfilParaEscribir } from "@/lib/perfil";
import { recalcularTablero } from "@/lib/recalculo";
import { getSession } from "@/lib/session";
import { loadSettings, SETTING_KEYS, type RadarSettings } from "@/lib/settings";

export interface Resultado {
  ok: boolean;
  mensaje?: string;
  /** Por campo, para pintar el error donde se cometio. */
  errores?: Partial<Record<Problema["campo"], string>>;
}

const NO_SESION: Resultado = { ok: false, errores: { general: "La sesión expiró. Vuelve a entrar." } };
const SIN_PERFIL: Resultado = { ok: false, errores: { general: "Elige un perfil antes de guardar." } };

/** Sesion y perfil, que toda escritura necesita. */
async function autor(): Promise<{ nombre: string; userId: string } | Resultado> {
  const session = await getSession();
  if (!session) return NO_SESION;
  const nombre = await perfilParaEscribir();
  if (!nombre) return SIN_PERFIL;
  return { nombre, userId: session.user.id };
}

const esResultado = (v: unknown): v is Resultado =>
  typeof v === "object" && v !== null && "ok" in v;

function aErrores(problemas: Problema[]): Resultado["errores"] {
  const errores: Resultado["errores"] = {};
  for (const p of problemas) errores[p.campo] = p.mensaje;
  return errores;
}

function refrescar() {
  revalidatePath("/reglas");
  revalidatePath("/");
}

// ---------------------------------------------------------------- vista previa

/** Un cambio todavia no guardado, para calcular su efecto. */
export interface Borrador {
  /** Regla creada (sin id) o modificada (con id). */
  regla?: ReglaEditable;
  /** Id de la regla que se eliminaria o desactivaria. */
  quitar?: string;
  parametros?: ParametrosEditables;
}

interface Guardado {
  reglas: Array<Rule & { id: string }>;
  settings: RadarSettings;
}

async function leerGuardado(): Promise<Guardado> {
  const [filas, settings] = await Promise.all([
    prisma.affinityRule.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }] }),
    loadSettings(),
  ]);
  return {
    reglas: filas.map((r) => ({
      id: r.id,
      kind: r.kind,
      pattern: r.pattern,
      weight: r.weight,
      vertical: r.vertical,
      buyerType: r.buyerType,
      active: r.active,
    })),
    settings,
  };
}

/**
 * El conjunto de reglas que quedaria si se guardara el borrador.
 *
 * Se respeta la posicion: una regla editada se queda donde estaba, y una nueva
 * va al final de su tipo, que es donde la va a poner `guardarRegla`. Si aqui se
 * ordenara distinto, la vista previa mentiria sobre la clasificacion (docs/04).
 */
function aplicarBorrador(guardadas: Array<Rule & { id: string }>, b: Borrador): Rule[] {
  let reglas: Rule[] = guardadas.map((r) => ({ ...r }));

  if (b.quitar) {
    reglas = guardadas.filter((r) => r.id !== b.quitar).map((r) => ({ ...r }));
  }

  if (b.regla) {
    const nueva: Rule = {
      kind: b.regla.kind,
      pattern: b.regla.pattern.trim(),
      weight: b.regla.weight,
      vertical: b.regla.vertical ?? null,
      buyerType: b.regla.buyerType ?? null,
      active: b.regla.active !== false,
    };
    const i = b.regla.id ? guardadas.findIndex((r) => r.id === b.regla?.id) : -1;
    if (i >= 0) reglas[i] = nueva;
    else {
      // Al final de su tipo, no al final de la tabla.
      const ultimo = reglas.map((r) => r.kind).lastIndexOf(nueva.kind);
      reglas.splice(ultimo + 1, 0, nueva);
    }
  }

  return reglas;
}

/**
 * Las activas del ultimo barrido, con lo que se sepa de cada una.
 *
 * `SeenTender` guarda solo el nombre. Las que ya estan en `Tender` traen ademas
 * descripcion, monto y tipo de proceso, que es exactamente lo que el barrido usa
 * en su segunda etapa (docs/04): sin eso, la vista previa diria que salen del
 * radar licitaciones que entraron por su descripcion.
 */
async function cargarCandidatas(): Promise<Candidata[]> {
  const ultimo = await prisma.jobRun.findFirst({
    where: { type: "SWEEP", ok: true },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });

  const [vistas, fichas] = await Promise.all([
    prisma.seenTender.findMany({
      // Solo el ultimo barrido: lo de hace una semana ya cerro y contarlo daria
      // un "hoy se seleccionarian N" que no corresponde a ningun hoy.
      where: ultimo ? { lastSeenAt: { gte: ultimo.startedAt } } : {},
      select: { code: true, name: true },
    }),
    prisma.tender.findMany({
      select: {
        code: true,
        description: true,
        estimatedAmount: true,
        processType: true,
        reviewStatus: true,
      },
    }),
  ]);

  const porCodigo = new Map(fichas.map((t) => [t.code, t]));

  return vistas.map((v) => {
    const ficha = porCodigo.get(v.code);
    return {
      code: v.code,
      name: v.name,
      description: ficha?.description || undefined,
      amount: ficha?.estimatedAmount != null ? Number(ficha.estimatedAmount) : null,
      processType: ficha?.processType ?? null,
      enTablero: ficha !== undefined,
      revisada: ficha !== undefined && ficha.reviewStatus !== "NEW",
    };
  });
}

const aThresholds = (s: ParametrosEditables | RadarSettings): Thresholds => ({
  affinityThreshold: s.affinityThreshold,
  maxAmount: s.maxAmount,
  processTypes: s.processTypes,
});

export interface ResultadoPrueba {
  ok: boolean;
  mensaje?: string;
  errores?: Resultado["errores"];
  comparacion?: Comparacion;
}

/**
 * "Probar con las activas de hoy" (docs/04).
 *
 * No escribe. Se llama con el borrador para ver el efecto antes de guardar, y
 * sin borrador para ver que hacen las reglas tal como estan.
 */
export async function probar(borrador: Borrador = {}): Promise<ResultadoPrueba> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  if (borrador.regla) {
    const problemas = validarRegla(borrador.regla);
    if (problemas.length > 0) return { ok: false, errores: aErrores(problemas) };
  }
  if (borrador.parametros) {
    const problemas = validarParametros(borrador.parametros);
    if (problemas.length > 0) return { ok: false, errores: aErrores(problemas) };
  }

  const guardado = await leerGuardado();
  const candidatas = await cargarCandidatas();

  if (candidatas.length === 0) {
    return {
      ok: false,
      errores: { general: "Todavía no hay un barrido con el que comparar." },
    };
  }

  const comparacion = comparar(
    candidatas,
    { rules: guardado.reglas, thresholds: aThresholds(guardado.settings) },
    {
      rules: aplicarBorrador(guardado.reglas, borrador),
      thresholds: aThresholds(borrador.parametros ?? guardado.settings),
    },
  );

  return { ok: true, comparacion };
}

// -------------------------------------------------------------------- escritura

async function anotar(
  nombre: string,
  action: string,
  entityId: string | null,
  detail: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: { userName: nombre, action, entity: "AffinityRule", entityId, detail },
  });
}

function leerRegla(formData: FormData): ReglaEditable {
  const id = String(formData.get("id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  return {
    id: id || undefined,
    kind,
    pattern: String(formData.get("pattern") ?? ""),
    weight: Number(formData.get("weight") ?? Number.NaN),
    vertical: kind === RULE_KINDS.KEYWORD ? ((formData.get("vertical") as Vertical) || null) : null,
    buyerType:
      kind === RULE_KINDS.BUYER_PATTERN ? ((formData.get("buyerType") as BuyerType) || null) : null,
  };
}

export async function guardarRegla(_previo: Resultado, formData: FormData): Promise<Resultado> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const regla = leerRegla(formData);
  const problemas = validarRegla(regla);
  if (problemas.length > 0) return { ok: false, errores: aErrores(problemas) };

  const datos = {
    kind: regla.kind,
    pattern: regla.pattern.trim(),
    weight: regla.weight,
    vertical: regla.vertical,
    buyerType: regla.buyerType,
    updatedBy: quien.nombre,
  };

  if (regla.id) {
    const previa = await prisma.affinityRule.findUnique({ where: { id: regla.id } });
    if (!previa) return { ok: false, errores: { general: "Esa regla ya no existe." } };

    await prisma.affinityRule.update({ where: { id: regla.id }, data: datos });
    await anotar(
      quien.nombre,
      "rule.update",
      regla.id,
      `${previa.pattern} (${previa.weight}) → ${datos.pattern} (${datos.weight})`,
    );
    refrescar();
    return { ok: true, mensaje: "Regla guardada. Se aplica en el próximo barrido." };
  }

  // Al final de su tipo: el orden decide los empates de peso y, en las reglas de
  // comprador, cual gana (docs/04). Una regla nueva no se cuela adelante.
  const ultima = await prisma.affinityRule.findFirst({
    where: { kind: regla.kind },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const creada = await prisma.affinityRule.create({
    data: { ...datos, position: (ultima?.position ?? 0) + 1 },
  });
  await anotar(quien.nombre, "rule.create", creada.id, `${datos.kind} · ${datos.pattern}`);
  refrescar();
  return { ok: true, mensaje: "Regla creada. Se aplica en el próximo barrido." };
}

export async function alternarRegla(id: string): Promise<Resultado> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const regla = await prisma.affinityRule.findUnique({ where: { id } });
  if (!regla) return { ok: false, errores: { general: "Esa regla ya no existe." } };

  await prisma.affinityRule.update({
    where: { id },
    data: { active: !regla.active, updatedBy: quien.nombre },
  });
  await anotar(
    quien.nombre,
    regla.active ? "rule.disable" : "rule.enable",
    id,
    regla.pattern.slice(0, 120),
  );
  refrescar();
  return { ok: true, mensaje: regla.active ? "Regla desactivada." : "Regla activada." };
}

export async function eliminarRegla(id: string): Promise<Resultado> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const regla = await prisma.affinityRule.findUnique({ where: { id } });
  if (!regla) return { ok: false, errores: { general: "Esa regla ya no existe." } };

  await prisma.affinityRule.delete({ where: { id } });
  await anotar(quien.nombre, "rule.delete", id, `${regla.kind} · ${regla.pattern.slice(0, 120)}`);
  refrescar();
  return { ok: true, mensaje: "Regla eliminada." };
}

/**
 * Subir o bajar una regla dentro de su tipo.
 *
 * No es cosmetico: en `BUYER_PATTERN` gana el primer patron que coincide —un
 * hospital municipal es un hospital porque HOSPITAL va antes— y en `KEYWORD`
 * el orden desempata los pesos iguales (docs/04).
 */
export async function moverRegla(id: string, direccion: "arriba" | "abajo"): Promise<Resultado> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const regla = await prisma.affinityRule.findUnique({ where: { id } });
  if (!regla) return { ok: false, errores: { general: "Esa regla ya no existe." } };

  const vecina = await prisma.affinityRule.findFirst({
    where:
      direccion === "arriba"
        ? { kind: regla.kind, position: { lt: regla.position } }
        : { kind: regla.kind, position: { gt: regla.position } },
    orderBy: { position: direccion === "arriba" ? "desc" : "asc" },
  });
  if (!vecina) return { ok: true, mensaje: "Ya está en el extremo." };

  // Las dos posiciones se intercambian juntas: a medio camino habria dos reglas
  // en la misma posicion y el orden volveria a ser el del monton.
  await prisma.$transaction([
    prisma.affinityRule.update({ where: { id: regla.id }, data: { position: vecina.position } }),
    prisma.affinityRule.update({ where: { id: vecina.id }, data: { position: regla.position } }),
  ]);
  await anotar(quien.nombre, "rule.move", id, `${direccion} · ${regla.pattern.slice(0, 80)}`);
  refrescar();
  return { ok: true };
}

export async function guardarParametros(
  _previo: Resultado,
  formData: FormData,
): Promise<Resultado> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const parametros: ParametrosEditables = {
    affinityThreshold: Number(formData.get("affinityThreshold") ?? Number.NaN),
    highAffinityThreshold: Number(formData.get("highAffinityThreshold") ?? Number.NaN),
    maxAmount: Number(formData.get("maxAmount") ?? Number.NaN),
    processTypes: formData.getAll("processTypes").map(String),
    canonMin: Number(formData.get("canonMin") ?? Number.NaN),
    canonMax: Number(formData.get("canonMax") ?? Number.NaN),
    lrPenalty: Number(formData.get("lrPenalty") ?? Number.NaN),
    noSoftwareItemPenalty: Number(formData.get("noSoftwareItemPenalty") ?? Number.NaN),
  };

  const problemas = validarParametros(parametros);
  if (problemas.length > 0) return { ok: false, errores: aErrores(problemas) };

  const previos = await loadSettings();

  await prisma.$transaction(
    (
      [
        [SETTING_KEYS.affinityThreshold, parametros.affinityThreshold],
        [SETTING_KEYS.highAffinityThreshold, parametros.highAffinityThreshold],
        [SETTING_KEYS.maxAmount, parametros.maxAmount],
        [SETTING_KEYS.processTypes, parametros.processTypes],
        [SETTING_KEYS.canonMin, parametros.canonMin],
        [SETTING_KEYS.canonMax, parametros.canonMax],
        [SETTING_KEYS.lrPenalty, parametros.lrPenalty],
        [SETTING_KEYS.noSoftwareItemPenalty, parametros.noSoftwareItemPenalty],
      ] as Array<[string, Prisma.InputJsonValue]>
    ).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  );

  await prisma.auditLog.create({
    data: {
      userName: quien.nombre,
      action: "settings.update",
      entity: "Setting",
      entityId: null,
      detail:
        `umbral ${previos.affinityThreshold}→${parametros.affinityThreshold} · ` +
        `aviso ${previos.highAffinityThreshold}→${parametros.highAffinityThreshold} · ` +
        `monto ${previos.maxAmount}→${parametros.maxAmount} · ` +
        `procesos ${previos.processTypes.join("/")}→${parametros.processTypes.join("/")} · ` +
        `canon ${previos.canonMin}-${previos.canonMax}→${parametros.canonMin}-${parametros.canonMax} · ` +
        `LR -${previos.lrPenalty}→-${parametros.lrPenalty} · sin software -${previos.noSoftwareItemPenalty}→-${parametros.noSoftwareItemPenalty}`,
    },
  });

  refrescar();
  return { ok: true, mensaje: "Parámetros guardados. Se aplican en el próximo barrido." };
}

export interface ResultadoRecalculo extends Resultado {
  revisadas?: number;
  cambiadas?: number;
  bajoUmbral?: number;
}

/**
 * Volver a puntuar las licitaciones que ya estan en el tablero.
 *
 * El calculo vive en `@/lib/recalculo` para que la consola pueda hacer lo
 * mismo sin sesion (`pnpm tablero:recalcular`). Aqui se le pone autor y
 * bitacora, que es lo que la pantalla agrega.
 */
export async function recalcularGuardadas(): Promise<ResultadoRecalculo> {
  const quien = await autor();
  if (esResultado(quien)) return quien;

  const guardado = await leerGuardado();
  // Umbrales y parametros de la ficha juntos: recalcular tambien rehace las senales estructurales.
  const { revisadas, cambiadas, bajoUmbral } = await recalcularTablero(guardado.reglas, guardado.settings);

  await prisma.auditLog.create({
    data: {
      userName: quien.nombre,
      action: "rules.recalculate",
      entity: "Tender",
      entityId: null,
      detail: `${revisadas} revisadas · ${cambiadas} cambiadas · ${bajoUmbral} bajo el umbral`,
    },
  });

  refrescar();
  return {
    ok: true,
    revisadas,
    cambiadas,
    bajoUmbral,
    mensaje:
      cambiadas === 0
        ? "Ninguna cambió de puntaje."
        : `${cambiadas} de ${revisadas} cambiaron de puntaje, vertical o etiquetas.`,
  };
}
