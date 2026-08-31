/**
 * Comparacion contra la version Python (docs/11).
 *
 * `seed/candidatas_2026-08-27.json` es la salida del motor Python sobre el barrido
 * del 27 de agosto de 2026. Ya **no** es el objetivo a reproducir: las reglas se
 * acotaron a desarrollo y arriendo de sistemas (docs/12 D-18), asi que el motor
 * en TypeScript selecciona menos a proposito.
 *
 * Lo que esta prueba sostiene es que **cada diferencia sea deliberada**. Si una
 * candidata deja de entrar sin razon declarada, o si una declarada vuelve a entrar,
 * la prueba falla. Es la red que avisa que el motor cambio de conducta.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INITIAL_RULES } from "@/lib/affinity/initial-rules";
import { evaluate } from "@/lib/affinity/rules";

interface Candidate {
  score: number;
  codigo: string;
  nombre: string;
  hits: string[];
  tipo: string;
}

const candidates: Candidate[] = JSON.parse(
  readFileSync(join(process.cwd(), "seed", "candidatas_2026-08-27.json"), "utf-8"),
);

const EXCLUDED = {
  /** docs/04 la lista entre los casos que NO deben seleccionarse: es un ERP municipal. */
  "1133353-43-LR26": "ERP municipal, excluida a proposito por docs/04",

  /** D-18: solo desarrollo y arriendo de sistemas. Una encuesta no es un sistema. */
  "1071775-13-LE26": "encuesta",
  "2287-21-L126": "encuesta",
  "568963-21-LE26": "encuesta",
  "4127-33-LP26": "encuesta",
  "619284-6-LR26": "encuesta",
  "799595-4-LP26": "encuesta",
  "2345-138-LP26": "encuesta",

  /** D-18: aparatos y obras, no software. */
  "1969-34-LS19": "automatizacion de un porton; ademas es LS (D-15)",
  "607-60-LE26": "mejora de dependencias de una oficina",
  "2287-20-L126": "mantencion de un ascensor",

  /** T-13 resuelto por D-18: la ciberseguridad no es desarrollo ni arriendo de sistemas. */
  "1075956-8-L126": "ethical hacking",
  "1978-44-LE26": "ciberseguridad",
  "609-25-LE26": "ciberseguridad",
  "1562-49-LR26": "ciberseguridad",
} as const;

const EXPECTED_SELECTED = candidates.length - Object.keys(EXCLUDED).length;

describe("motor TypeScript contra la base del motor Python", () => {
  it("la base trae las 40 candidatas del 27-08-2026", () => {
    expect(candidates).toHaveLength(40);
  });

  it("toda candidata que queda fuera tiene una razon declarada", () => {
    const undocumented = candidates
      .filter((c) => !evaluate({ text: c.nombre }, INITIAL_RULES).selected)
      .filter((c) => !(c.codigo in EXCLUDED))
      .map((c) => `${c.codigo} (py=${c.score}): ${c.nombre}`);

    expect(undocumented).toEqual([]);
  });

  it("ninguna exclusion declarada quedo obsoleta", () => {
    // Si una regla nueva vuelve a seleccionarla, hay que sacarla de la lista en
    // vez de dejar una excepcion que ya no describe nada.
    const stale = Object.keys(EXCLUDED).filter((code) => {
      const c = candidates.find((x) => x.codigo === code);
      return c && evaluate({ text: c.nombre }, INITIAL_RULES).selected;
    });

    expect(stale).toEqual([]);
  });

  it(`selecciona exactamente ${EXPECTED_SELECTED} de 40`, () => {
    const selected = candidates.filter((c) => evaluate({ text: c.nombre }, INITIAL_RULES).selected);
    expect(selected).toHaveLength(EXPECTED_SELECTED);
  });
});

describe("acotar a sistemas no toco el negocio de siempre (D-18)", () => {
  // Contactabilidad y agendamiento entran por APPOINTMENTS, no por la regla
  // generica que se recorto. Son 21 de las 45 adjudicaciones del historico.
  const CORE = candidates.filter((c) => /contactab|agendam|whatsapp/i.test(c.nombre));

  it("hay casos de contactabilidad en la base", () => {
    expect(CORE.length).toBeGreaterThan(0);
  });

  it.each(CORE.map((c) => c.nombre))("sigue entrando: %s", (nombre) => {
    expect(evaluate({ text: nombre }, INITIAL_RULES).selected).toBe(true);
  });
});
