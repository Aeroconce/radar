/**
 * Senales estructurales de la ficha (docs/15, D-41).
 *
 * Primero cada senal por separado; despues los 20 casos de septiembre con el
 * puntaje completo (texto + ficha), que es el que decide en la segunda etapa
 * del barrido. La tabla "despues" de docs/13 es el contrato: las viables entre
 * 14 y 18, las trampas bajo el umbral, y las que solo la revision descarta
 * (UFRO, Bulnes) en el tablero pero debajo de toda viable.
 */
import { describe, expect, it } from "vitest";
import { detectOpportunitySignals } from "@/lib/affinity/classify";
import { INITIAL_RULES } from "@/lib/affinity/initial-rules";
import { DEFAULT_THRESHOLDS, evaluate, withStructural } from "@/lib/affinity/rules";
import {
  canonMensual,
  categoriasDe,
  computeStructural,
  DEFAULT_STRUCTURAL,
  mesesDe,
  type StructuralInput,
} from "@/lib/affinity/structural";
import { CASOS, type Caso } from "./fixtures/casos-septiembre-2026";

const base: StructuralInput = {
  name: "Arriendo de sistema de gestion",
  description: "plataforma para gestionar",
  estimatedAmount: null,
  durationValue: null,
  durationUnit: null,
  processType: "LE",
  items: null,
  opportunitySignals: [],
};

const software = { Listado: [{ Categoria: "Tecnologías de la información, telecomunicaciones y radiodifusión / Software / Software de gestión" }] };

// ------------------------------------------------------------------ duracion

describe("duracion en meses", () => {
  it("convierte dias, semanas y anos", () => {
    expect(mesesDe(60, "dias")).toBe(2);
    expect(mesesDe(12, "meses")).toBe(12);
    expect(mesesDe(2, "anos")).toBe(24);
    expect(mesesDe(36, "semanas")).toBeCloseTo(8.3, 1);
  });

  it("sin dato no hay meses", () => {
    expect(mesesDe(null, null)).toBeNull();
    expect(mesesDe(0, "meses")).toBeNull();
  });

  it("el canon es el monto repartido en los meses", () => {
    expect(canonMensual(42_000_000, 36, "meses")).toBeCloseTo(1_166_667, 0);
    expect(canonMensual(null, 36, "meses")).toBeNull();
    expect(canonMensual(42_000_000, null, null)).toBeNull();
  });
});

// --------------------------------------------------------------------- senales

describe("canon mensual", () => {
  it("dentro de la banda suma 2", () => {
    const r = computeStructural({ ...base, estimatedAmount: 42_000_000, durationValue: 36, durationUnit: "meses" });
    expect(r.score).toBe(2);
    expect(r.tags).toContain("canon ok");
  });

  it("fuera de la banda resta 2 y dice cuanto", () => {
    const r = computeStructural({ ...base, estimatedAmount: 182_400_000, durationValue: 24, durationUnit: "meses" });
    expect(r.score).toBe(-2);
    expect(r.tags).toContain("canon 7.6M");
  });

  it("sin monto no penaliza: la senal se omite", () => {
    // La API deja el monto vacio a veces (Sotero del Rio, Aconcagua).
    const r = computeStructural({ ...base, estimatedAmount: null, durationValue: 24, durationUnit: "meses" });
    expect(r.score).toBe(0);
    expect(r.tags).toEqual([]);
  });

  it("la banda se lee de los parametros", () => {
    const r = computeStructural(
      { ...base, estimatedAmount: 182_400_000, durationValue: 24, durationUnit: "meses" },
      { ...DEFAULT_STRUCTURAL, canonMax: 10_000_000 },
    );
    expect(r.tags).toContain("canon ok");
  });
});

describe("tipo de proceso y compra unica", () => {
  it("LR resta y etiqueta, no descarta", () => {
    const r = computeStructural({ ...base, processType: "LR" });
    expect(r.score).toBe(-DEFAULT_STRUCTURAL.lrPenalty);
    expect(r.tags).toEqual(["LR"]);
  });

  it("adquisicion sin duracion es un bien", () => {
    const r = computeStructural({ ...base, name: "ADQUISICION DE SERVIDOR DE DATOS" });
    expect(r.score).toBe(-2);
    expect(r.tags).toContain("compra unica");
  });

  it("adquisicion con duracion es arriendo: la duracion la salva", () => {
    // Alto Hospicio: "Adquisicion de Sistema de Control de Asistencia", 24 meses.
    const r = computeStructural({ ...base, name: "Adquisición de Sistema de Control de Asistencia", durationValue: 24, durationUnit: "meses" });
    expect(r.tags).not.toContain("compra unica");
  });
});

describe("categoria de los items", () => {
  it("lee las categorias del objeto Items tal como lo guarda Tender", () => {
    expect(categoriasDe(software)).toHaveLength(1);
    expect(categoriasDe(software.Listado)).toHaveLength(1);
    expect(categoriasDe(null)).toEqual([]);
    expect(categoriasDe({})).toEqual([]);
  });

  it("sin ningun item de software resta lo mismo que una exclusion (D-45)", () => {
    const r = computeStructural({ ...base, items: { Listado: [{ Categoria: "Publicidad / Publicidad en radio" }] } });
    expect(r.tags).toContain("sin item de software");
    expect(r.tags).toContain("item de bienes");
    expect(r.score).toBe(-DEFAULT_STRUCTURAL.noSoftwareItemPenalty - 2);
  });

  it("servicios informaticos cuentan como software", () => {
    const r = computeStructural({ ...base, items: { Listado: [{ Categoria: "Servicios informáticos / Ingeniería en computación e informática" }] } });
    expect(r.tags).not.toContain("sin item de software");
  });

  it("un item de bienes resta 2 aunque haya software", () => {
    const r = computeStructural({
      ...base,
      items: { Listado: [...software.Listado, { Categoria: "Equipos informáticos y accesorios / Computadores / Servidores" }] },
    });
    expect(r.tags).toEqual(["item de bienes"]);
    expect(r.score).toBe(-2);
  });

  it("una ficha sin items no dice nada", () => {
    expect(computeStructural({ ...base, items: { Listado: [] } }).tags).toEqual([]);
  });
});

describe("integral en el nombre (D-45)", () => {
  it("resta 2 y etiqueta", () => {
    const r = computeStructural({ ...base, name: "SERVICIO TECNOLÓGICO INTEGRAL RED REGIONAL" });
    expect(r.score).toBe(-2);
    expect(r.tags).toEqual(["integral"]);
  });

  it("solo sobre el nombre: Alto Hospicio dice solucion integral en la descripcion y es viable", () => {
    const r = computeStructural({
      ...base,
      name: "Adquisición de Sistema de Control de Asistencia",
      description: "arriendo de una solución integral de gestión y control de asistencia",
      durationValue: 24,
      durationUnit: "meses",
    });
    expect(r.tags).not.toContain("integral");
  });

  it("no dispara dentro de otra palabra", () => {
    expect(computeStructural({ ...base, name: "Integralidad del sistema" }).tags).not.toContain("integral");
  });
});

describe("descripcion y oportunidad", () => {
  it("una descripcion que remite al adjunto se etiqueta sin restar", () => {
    const r = computeStructural({ ...base, description: "DE ACUERDO A REQUERIMIENTO ADJUNTO" });
    expect(r.score).toBe(0);
    expect(r.tags).toEqual(["sin descripcion util"]);
  });

  it("reserva EMT suma 2 y relanzamiento suma 1", () => {
    const r = computeStructural({ ...base, opportunitySignals: ["Empresas de Menor Tamaño", "segundo llamado"] });
    expect(r.score).toBe(3);
    expect(r.tags).toEqual(["reservada EMT", "relanzamiento"]);
  });
});

// --------------------------------------------- muestra de septiembre de 2026

describe("puntaje completo sobre la muestra de septiembre (docs/13, tabla despues)", () => {
  const umbral = DEFAULT_THRESHOLDS.affinityThreshold;
  const texto = (c: Caso) => `${c.name} ${c.description}`;

  function total(c: Caso) {
    const porTexto = evaluate({ text: texto(c), amount: c.amount, processType: c.processType }, INITIAL_RULES);
    const estructural = computeStructural({
      name: c.name,
      description: c.description,
      estimatedAmount: c.amount,
      durationValue: c.months,
      durationUnit: c.months === null ? null : "meses",
      processType: c.processType,
      items: { Listado: [{ Categoria: c.item }] },
      opportunitySignals: detectOpportunitySignals(texto(c), INITIAL_RULES),
    });
    return { ...withStructural(porTexto, estructural), tags: estructural.tags, texto: porTexto.score };
  }

  const viables = CASOS.filter((c) => c.esperado === "entra");
  const trampas = CASOS.filter((c) => c.esperado === "no entra");
  const bajas = CASOS.filter((c) => c.esperado === "entra bajo");
  const alBorde = CASOS.filter((c) => c.esperado === "al borde");

  it.each(viables.map((c) => [c.code, c] as const))("viable, entre 14 y 18: %s", (_, c) => {
    const r = total(c);
    expect(r.selected).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(14);
    expect(r.score).toBeLessThanOrEqual(18);
  });

  it.each(trampas.map((c) => [c.code, c] as const))("trampa bajo el umbral: %s", (_, c) => {
    expect(total(c).selected).toBe(false);
  });

  it.each(bajas.map((c) => [c.code, c.tagEsperada, c] as const))("entra bajo, con etiqueta %s: %s", (_, tag, c) => {
    const r = total(c);
    expect(r.selected).toBe(true);
    expect(r.tags).toContain(tag);
  });

  it("toda viable rankea sobre toda la que entra bajo", () => {
    const peorViable = Math.min(...viables.map((c) => total(c).score));
    const mejorBaja = Math.max(...bajas.map((c) => total(c).score));
    expect(peorViable).toBeGreaterThan(mejorBaja);
  });

  it.each(alBorde.map((c) => [c.code, c] as const))("al borde, sin rankear alto: %s", (_, c) => {
    // Un LR de 60 meses con canon de $6,9M merece una mirada rapida, no un
    // puesto entre las viables: LR, canon y fuera de escala lo dejan cerca del umbral.
    const r = total(c);
    expect(r.score).toBeLessThanOrEqual(umbral + 1);
    expect(r.tags).toEqual(expect.arrayContaining(["LR", "canon 6.9M"]));
  });

  it("la ficha explica lo que el texto no puede: las que entran bajo tienen su etiqueta", () => {
    // UFRO: texto de software, descripcion vacia. Bulnes: texto de software, canon de ERP.
    expect(total(bajas[0]).tags).toContain("sin descripcion util");
    expect(total(bajas[1]).tags).toContain("canon 7.6M");
  });
});
