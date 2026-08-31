/**
 * Pruebas del editor de reglas (RF-09, docs/11).
 *
 * Dos cosas que la pantalla no puede equivocarse: rechazar una regla que el
 * motor ignoraria en silencio, y decir la verdad sobre que entra y que sale.
 */
import { describe, expect, it } from "vitest";
import { INITIAL_RULES } from "@/lib/affinity/initial-rules";
import { comparar, MAX_FILAS, type Candidata } from "@/lib/affinity/preview";
import { DEFAULT_THRESHOLDS, RULE_KINDS, type Rule } from "@/lib/affinity/rules";
import { PESO_MAXIMO, validarParametros, validarRegla } from "@/lib/affinity/validate";
import { bordesDe, terminosDe, trozosDe } from "@/lib/rule-kinds";

// ------------------------------------------------------------------ validacion

describe("validarRegla", () => {
  const base = { kind: RULE_KINDS.KEYWORD, pattern: "sistema de gestion", weight: 5, vertical: "WEB_DEVELOPMENT" as const };

  it("acepta una regla bien escrita", () => {
    expect(validarRegla(base)).toEqual([]);
  });

  it("rechaza una expresion que no compila", () => {
    // El motor la ignoraria sin decir nada y la pantalla la mostraria activa.
    const p = validarRegla({ ...base, pattern: "sistema (de" });
    expect(p.map((x) => x.campo)).toContain("pattern");
  });

  it("rechaza tildes y enes, que nunca coincidirian", () => {
    // El texto se normaliza antes de evaluar: "gestión" no matchea nada.
    expect(validarRegla({ ...base, pattern: "gestion documental|digitalizacion" })).toEqual([]);
    expect(validarRegla({ ...base, pattern: "gestión documental" }).map((x) => x.campo)).toContain(
      "pattern",
    );
    expect(validarRegla({ ...base, pattern: "diseno|ensenanza" })).toEqual([]);
    expect(validarRegla({ ...base, pattern: "enseñanza" }).map((x) => x.campo)).toContain("pattern");
  });

  it("acepta mayusculas: el motor compila con la bandera i", () => {
    expect(validarRegla({ ...base, pattern: "[a-z]+ SaaS" })).toEqual([]);
  });

  it("exige que una palabra clave sume y una exclusion reste", () => {
    expect(validarRegla({ ...base, weight: -3 }).map((x) => x.campo)).toContain("weight");
    expect(
      validarRegla({ kind: RULE_KINDS.EXCLUSION, pattern: "toner", weight: 4 }).map((x) => x.campo),
    ).toContain("weight");
    expect(validarRegla({ kind: RULE_KINDS.EXCLUSION, pattern: "toner", weight: -6 })).toEqual([]);
  });

  it("acota el peso para que nadie desactive el umbral de hecho", () => {
    expect(validarRegla({ ...base, weight: PESO_MAXIMO + 1 }).map((x) => x.campo)).toContain("weight");
  });

  it("pide vertical a una palabra clave y comprador a un patron de comprador", () => {
    expect(validarRegla({ ...base, vertical: null }).map((x) => x.campo)).toContain("vertical");
    expect(
      validarRegla({ kind: RULE_KINDS.BUYER_PATTERN, pattern: "hospital", weight: 0 }).map(
        (x) => x.campo,
      ),
    ).toContain("buyerType");
    expect(
      validarRegla({
        kind: RULE_KINDS.BUYER_PATTERN,
        pattern: "hospital",
        weight: 0,
        buyerType: "HOSPITAL",
      }),
    ).toEqual([]);
  });

  it("rechaza un tipo de regla inventado", () => {
    expect(validarRegla({ ...base, kind: "LO_QUE_SEA" }).map((x) => x.campo)).toEqual(["kind"]);
  });
});

describe("validarParametros", () => {
  const base = {
    affinityThreshold: 3,
    highAffinityThreshold: 8,
    maxAmount: 200_000_000,
    processTypes: ["L1", "LE"],
  };

  it("acepta los valores de docs/04", () => {
    expect(validarParametros(base)).toEqual([]);
  });

  it("rechaza un umbral de aviso bajo el de seleccion", () => {
    // Avisaria de todo lo que entra: el correo se vuelve ruido y se deja de leer.
    expect(validarParametros({ ...base, highAffinityThreshold: 2 })).not.toEqual([]);
  });

  it("exige al menos un tipo de proceso", () => {
    expect(validarParametros({ ...base, processTypes: [] })).not.toEqual([]);
  });

  it("rechaza un tipo de proceso que no existe", () => {
    expect(validarParametros({ ...base, processTypes: ["L1", "XX"] })).not.toEqual([]);
  });
});

// ---------------------------------------------------------------- vista previa

const candidata = (over: Partial<Candidata> & { code: string; name: string }): Candidata => ({
  enTablero: false,
  revisada: false,
  ...over,
});

const vigente = { rules: INITIAL_RULES, thresholds: DEFAULT_THRESHOLDS };

describe("comparar", () => {
  const CANDIDATAS = [
    candidata({ code: "1-1-LE26", name: "DESARROLLO DE SISTEMA INFORMATICO DE GESTION" }),
    // Caso obligatorio de docs/04: "sistema informatico" suma 5 y "reactivos"
    // resta 6, asi que queda fuera por la exclusion y no por falta de puntaje.
    candidata({ code: "2-2-LE26", name: "ADQUISICIÓN DE REACTIVOS PARA SISTEMA INFORMÁTICO DE LABORATORIO" }),
    candidata({ code: "3-3-LE26", name: "Curso de capacitación en software estadístico" }),
  ];

  it("sin cambios, no entra ni sale nada", () => {
    const c = comparar(CANDIDATAS, vigente, vigente);
    expect(c.antes).toBe(c.despues);
    expect(c.totalEntran).toBe(0);
    expect(c.totalSalen).toBe(0);
  });

  it("subir el umbral saca licitaciones", () => {
    const c = comparar(CANDIDATAS, vigente, {
      rules: INITIAL_RULES,
      thresholds: { ...DEFAULT_THRESHOLDS, affinityThreshold: 99 },
    });
    expect(c.despues).toBe(0);
    expect(c.totalSalen).toBe(c.antes);
    expect(c.salen.map((f) => f.code)).toContain("1-1-LE26");
  });

  it("quitar una exclusion hace entrar lo que excluia", () => {
    const sinReactivos: Rule[] = INITIAL_RULES.filter((r) => !r.pattern.includes("reactivos"));
    const c = comparar(CANDIDATAS, vigente, {
      rules: sinReactivos,
      thresholds: DEFAULT_THRESHOLDS,
    });
    expect(c.entran.map((f) => f.code)).toContain("2-2-LE26");
    expect(c.totalSalen).toBe(0);
  });

  it("usa la descripcion cuando la licitacion ya esta en el tablero", () => {
    // El barrido puntua en dos etapas: si el nombre queda cerca del umbral, pide
    // la ficha y recalcula con la descripcion (docs/04). Sin esto, la vista previa
    // diria que sale del radar algo que entro justamente por su descripcion.
    const soloNombre = candidata({ code: "4-4-LE26", name: "Servicio de apoyo institucional" });
    const conDescripcion = candidata({
      ...soloNombre,
      description: "Desarrollo de una plataforma web para la gestion de expedientes",
      enTablero: true,
    });

    const sinDesc = comparar([soloNombre], vigente, vigente);
    const conDesc = comparar([conDescripcion], vigente, vigente);
    expect(sinDesc.antes).toBe(0);
    expect(conDesc.antes).toBe(1);
  });

  it("cuenta aparte las que salen y ya estaban revisadas", () => {
    const revisada = candidata({
      code: "5-5-LE26",
      name: "DESARROLLO DE SISTEMA INFORMATICO DE GESTION",
      enTablero: true,
      revisada: true,
    });
    const c = comparar([revisada], vigente, {
      rules: INITIAL_RULES,
      thresholds: { ...DEFAULT_THRESHOLDS, affinityThreshold: 99 },
    });
    expect(c.salenRevisadas).toBe(1);
  });

  it("recorta la lista pero no el conteo", () => {
    const muchas = Array.from({ length: MAX_FILAS + 15 }, (_, i) =>
      candidata({ code: `x-${i}`, name: "DESARROLLO DE SISTEMA INFORMATICO DE GESTION" }),
    );
    const c = comparar(muchas, vigente, {
      rules: INITIAL_RULES,
      thresholds: { ...DEFAULT_THRESHOLDS, affinityThreshold: 99 },
    });
    expect(c.salen).toHaveLength(MAX_FILAS);
    expect(c.totalSalen).toBe(MAX_FILAS + 15);
  });
});

// -------------------------------------------------------- lectura de un patron

describe("terminosDe", () => {
  it("corta por las barras de primer nivel", () => {
    expect(terminosDe("agendamiento|whatsapp|chatbot")).toEqual([
      "agendamiento",
      "whatsapp",
      "chatbot",
    ]);
  });

  it("no corta dentro de un parentesis: es un solo termino", () => {
    expect(terminosDe("confirmacion de (citas|horas)|recordatorio")).toEqual([
      "confirmacion de (citas|horas)",
      "recordatorio",
    ]);
  });

  it("no corta dentro de una clase de caracteres", () => {
    expect(terminosDe("informatic[oa]|digital")).toEqual(["informatic[oa]", "digital"]);
  });

  it("conserva el espacio del borde, que es parte de la regla", () => {
    // "crs " con espacio no coincide dentro de otra palabra. Recortarlo para
    // mostrarlo dejaria en pantalla una regla distinta de la que se evalua.
    expect(terminosDe("crs |cesfam")).toEqual(["crs ", "cesfam"]);
    expect(bordesDe("crs ")).toEqual({ inicio: "", nucleo: "crs", fin: " " });
    expect(bordesDe("das ")).toEqual({ inicio: "", nucleo: "das", fin: " " });
    expect(bordesDe("hospital")).toEqual({ inicio: "", nucleo: "hospital", fin: "" });
  });

  it("no corta por una barra escapada", () => {
    // Una barra escapada es parte del termino, no un separador.
    expect(terminosDe(String.raw`a\|b`)).toEqual([String.raw`a\|b`]);
    // Como en la regla de comprador de los servicios de salud.
    expect(terminosDe(String.raw`servicio de salud|s\.s\.|cesfam`)).toEqual([
      "servicio de salud",
      String.raw`s\.s\.`,
      "cesfam",
    ]);
  });

  it("respeta los limites de palabra", () => {
    expect(terminosDe(String.raw`\bcurso|capacitacion en`)).toEqual([
      String.raw`\bcurso`,
      "capacitacion en",
    ]);
  });

  it("devuelve todos los terminos de las reglas reales", () => {
    // Ninguna regla de docs/04 debe quedar sin partir ni partirse de mas.
    for (const r of INITIAL_RULES) {
      const t = terminosDe(r.pattern);
      expect(t.length).toBeGreaterThan(0);
      // Volver a unirlos reconstruye el patron: no se pierde ni se agrega nada.
      expect(t.join("|")).toBe(r.pattern);
    }
  });
});

describe("trozosDe", () => {
  it("separa palabras de sintaxis", () => {
    expect(trozosDe("activos? fijos?")).toEqual([
      { texto: "activos", esTexto: true },
      { texto: "?", esTexto: false },
      { texto: " fijos", esTexto: true },
      { texto: "?", esTexto: false },
    ]);
  });

  it("conserva el termino entero", () => {
    const t = "confirmacion de (citas|horas)";
    expect(trozosDe(t).map((x) => x.texto).join("")).toBe(t);
  });
});
