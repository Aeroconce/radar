/**
 * Pruebas del motor de afinidad (docs/11).
 *
 * Los casos obligatorios salen de docs/04 y son el contrato del motor: si uno
 * falla, la regla cambio y hay que decidir si el cambio es correcto, no ajustar
 * la prueba para que pase.
 */
import { describe, expect, it } from "vitest";
import { INITIAL_RULES } from "@/lib/affinity/initial-rules";
import { classifyBuyer, classifyVertical, detectIncumbentSignals } from "@/lib/affinity/classify";
import {
  DEFAULT_THRESHOLDS,
  evaluate,
  normalize,
  scoreText,
  worthFetchingDetail,
} from "@/lib/affinity/rules";

const select = (name: string) => evaluate({ text: name }, INITIAL_RULES).selected;

// --------------------------------------------------- casos obligatorios docs/04

describe("casos que deben seleccionarse (docs/04)", () => {
  const CASES = [
    "SS. Contactabilidad de pacientes vía WhatsApp",
    "ADQUISICION SERVICIO DE SISTEMA INFORMATIVO DE GESTION DOCUMENTAL",
    "SOLUCIÓN INFORMÁTICA INSTITUCIONAL PARA EL CFT",
    "SISTEMA INFORMATICO WEB PARA CENTROS DE SALUD",
    // Sin el "de" entre ARRIENDO y SOFTWARE: asi se escapo en agosto de 2026.
    "ARRIENDO SOFTWARE FARMACIA Y OPTICA MUNICIPAL",
    // D-31: auditoria del 31-08-2026 sobre las 4.721 activas del dia. Cada uno
    // es un falso negativo real que puntuaba 0 o 2.
    "CONTRATACIÓN DEL DESARROLLO DE LA PLATAFORMA MODULAR DE COMPRAS",
    "ARRIENDO DE SISTEMA PARA LA GESTIÓN DE COBRANZAS",
    "SERVICIO DE SUSCRIPCIÓN DE SISTEMA DE ASIGNACIÓN Y ADMINISTRACION DE SALAS DE CLASES",
    "CONTRATACION DE SOFTWARE CONTROL DE OBRAS Y GESTION DE PROYECTOS",
    "Servicio de Soporte Desarrollo y Mejora Evolutiva",
    "Sistema de gestión de Libro de Obras Digital",
    "Servicio de Metodología de Contactabilidad",
  ];

  it.each(CASES)("selecciona: %s", (name) => {
    expect(select(name)).toBe(true);
  });
});

describe("casos que NO deben seleccionarse (docs/04)", () => {
  const CASES = [
    "ADQUISICIÓN DE REACTIVOS PARA SISTEMA INFORMÁTICO DE LABORATORIO",
    "RENOVACIÓN DE LICENCIAS ADOBE",
    "SERV DE ACTUALIZACION ACTIVO FIJO E INVENTARIO",
    "Curso de capacitación en software estadístico",
    "Sistema de riego automatizado",
    "ARRIENDO DE SOFTWARE INTEGRAL PARA LA GESTIÓN MUNICIPAL",
    // D-30: comprar licencias es reventa, no desarrollo ni arriendo de un sistema.
    "ADQUISICIÓN DE LICENCIAS DE SOFTWARE",
    "Provisión de licencias de software para la unidad administradora",
    // D-30: comprar prestaciones medicas a terceros no es software, aunque su
    // texto hable de calidad y acreditacion.
    "Contratación de Servicios para realizar procesamiento y análisis de exámenes de laboratorio en el extrasistema",
    // D-30: equipos tecnologicos y medicos son hardware, no plataformas.
    "ADQUISICIÓN EQUIPOS TECNOLÓGICOS PARA REHABILITACIÓN",
  ];

  it.each(CASES)("descarta: %s", (name) => {
    expect(select(name)).toBe(false);
  });

  it("comprar licencias resta, pero arrendar un sistema que gestiona licencias no", () => {
    // La palabra "licencia" aparece en sistemas legitimos: un modulo de
    // licencias medicas, la toma de horas de licencias de conducir. La
    // exclusion apunta a la compra ("licencias de software", "adquisicion de
    // licencias"), no a la palabra.
    expect(select("ARRIENDO DE SOFTWARE PARA GESTIÓN DE LICENCIAS MÉDICAS")).toBe(true);
  });
});

// --------------------------------------------------------------- normalizacion

describe("normalizacion", () => {
  it("baja a minusculas y quita tildes", () => {
    expect(normalize("SOLUCIÓN INFORMÁTICA")).toBe("solucion informatica");
    expect(normalize("Ñuñoa")).toBe("nunoa");
  });

  it("conserva las posiciones, para poder recortar el texto original", () => {
    const original = "SOLUCIÓN INFORMÁTICA INSTITUCIONAL";
    expect(normalize(original)).toHaveLength(original.length);
  });

  it("devuelve la coincidencia con sus tildes, no la version normalizada", () => {
    const { matchedTerms } = scoreText("Contratar un SISTEMA INFORMÁTICO nuevo", INITIAL_RULES);
    expect(matchedTerms).toContain("SISTEMA INFORMÁTICO");
  });
});

// ------------------------------------------------------------------- puntajes

describe("puntaje", () => {
  it("cuenta cada regla una sola vez aunque coincida varias veces", () => {
    const once = scoreText("sistema", INITIAL_RULES).score;
    const many = scoreText("sistema sistema sistema sistema", INITIAL_RULES).score;
    expect(many).toBe(once);
  });

  it("las exclusiones restan", () => {
    const limpio = scoreText("sistema informatico para el hospital", INITIAL_RULES).score;
    const conHardware = scoreText("sistema informatico y notebook para el hospital", INITIAL_RULES).score;
    expect(conHardware).toBe(limpio - 6);
  });

  it("un texto sin relacion no suma nada", () => {
    expect(scoreText("Arriendo de maquinaria para movimiento de tierra", INITIAL_RULES).score).toBe(0);
  });

  it("las exclusiones no disparan dentro de otra palabra", () => {
    // Regresion: `curso` sin limite de palabra matcheaba en "recursos" y restaba
    // 6 puntos a licitaciones de desarrollo por una frase administrativa comun.
    // Ocurria en 5 de las 87 fichas de la semilla.
    const limpio = scoreText("Desarrollo de un sistema informatico", INITIAL_RULES).score;
    const conRecursos = scoreText(
      "Desarrollo de un sistema informatico, segun los recursos involucrados",
      INITIAL_RULES,
    ).score;
    expect(conRecursos).toBe(limpio);

    // Pero un curso de verdad si debe restar.
    const conCurso = scoreText("Desarrollo de un sistema informatico y un curso", INITIAL_RULES).score;
    expect(conCurso).toBe(limpio - 6);
  });
});

// --------------------------------------------------------------- monto y tipo

describe("monto y tipo de proceso", () => {
  const texto = "Desarrollo de sistema informatico institucional";

  it("sobre el monto maximo se marca fuera de escala pero no se descarta", () => {
    const r = evaluate({ text: texto, amount: 500_000_000 }, INITIAL_RULES);
    expect(r.outOfScale).toBe(true);
    expect(r.selected).toBe(true);
  });

  it("estar fuera de escala resta 2 de afinidad", () => {
    const dentro = evaluate({ text: texto, amount: 1_000_000 }, INITIAL_RULES);
    const fuera = evaluate({ text: texto, amount: 500_000_000 }, INITIAL_RULES);
    expect(fuera.score).toBe(dentro.score - 2);
  });

  it("sin monto publicado no se marca fuera de escala", () => {
    expect(evaluate({ text: texto, amount: null }, INITIAL_RULES).outOfScale).toBe(false);
  });

  it("LS no se selecciona aunque el puntaje alcance (D-15)", () => {
    const r = evaluate({ text: texto, processType: "LS" }, INITIAL_RULES);
    expect(r.score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.affinityThreshold);
    expect(r.selected).toBe(false);
  });

  it("los tipos de la lista si se seleccionan", () => {
    for (const t of DEFAULT_THRESHOLDS.processTypes) {
      expect(evaluate({ text: texto, processType: t }, INITIAL_RULES).selected).toBe(true);
    }
  });
});

describe("las dos etapas del barrido (docs/04)", () => {
  it("a un punto del umbral vale la pena pedir la ficha", () => {
    expect(worthFetchingDetail(DEFAULT_THRESHOLDS.affinityThreshold - 1)).toBe(true);
  });

  it("mas abajo no", () => {
    expect(worthFetchingDetail(DEFAULT_THRESHOLDS.affinityThreshold - 2)).toBe(false);
  });

  it("la descripcion puede sacar lo que el nombre habia dejado entrar", () => {
    // El nombre suena a gestor documental; la descripcion revela que el trabajo
    // es escanear papeles, no construir ni arrendar nada.
    const nombre = "Gestor documental institucional";
    const conDescripcion = `${nombre}. Corresponde a la digitalizacion masiva del archivo en papel`;

    expect(evaluate({ text: nombre }, INITIAL_RULES).selected).toBe(true);
    expect(evaluate({ text: conDescripcion }, INITIAL_RULES).selected).toBe(false);
  });

  it("un tema sin sistema ya no entra ni por el nombre (D-29)", () => {
    // Caso real del barrido del 27-08-2026 (824-3-LE26). Antes entraba con 6
    // por la palabra "inventario" y recien la descripcion lo botaba, gastando
    // una llamada a la API. Ahora "inventario" pesa 2 y no llega al umbral solo.
    expect(evaluate({ text: "ASES. A LA CONTRAPARTE TECN. INVENTARIO MAULE" }, INITIAL_RULES).selected).toBe(false);
  });

  it("un nombre lejos del umbral nunca llega a mirar su descripcion", () => {
    // Si el nombre no justifica pedir la ficha, la descripcion no participa: el
    // worker jamas la tiene. Evaluar directo sobre ambas daria un resultado que
    // el barrido no puede producir.
    const nombre = "Adquisicion de solucion XDR";
    const porNombre = scoreText(nombre, INITIAL_RULES).score;

    expect(porNombre).toBeLessThan(DEFAULT_THRESHOLDS.affinityThreshold);
    expect(worthFetchingDetail(porNombre)).toBe(false);
  });
});

// ------------------------------------------------------------- clasificacion

describe("vertical", () => {
  it.each([
    ["Confirmacion de horas por WhatsApp", "APPOINTMENTS"],
    ["Servicio de gestion documental y oficina de partes", "DOCUMENT_MGMT"],
    ["Acreditacion y seguridad del paciente", "QUALITY_ACCREDITATION"],
    ["Control de inventario de activos fijos", "FIXED_ASSETS"],
    ["Desarrollo de plataforma web institucional", "WEB_DEVELOPMENT"],
  ])("%s -> %s", (texto, esperado) => {
    expect(classifyVertical(texto, INITIAL_RULES)).toBe(esperado);
  });

  it("gana la regla mas especifica sobre la generica", () => {
    // "sistema" pesa 2 en OTHER; "sistema informatico" pesa 5 en WEB_DEVELOPMENT.
    expect(classifyVertical("Sistema informatico de gestion", INITIAL_RULES)).toBe("WEB_DEVELOPMENT");
  });

  it("sin coincidencia especifica queda OTHER", () => {
    expect(classifyVertical("Arriendo de camionetas", INITIAL_RULES)).toBe("OTHER");
  });
});

describe("tipo de comprador", () => {
  it.each([
    ["HOSPITAL CLINICO METROPOLITANO EL CARMEN", "", "HOSPITAL"],
    ["SERVICIO DE SALUD CONCEPCION", "", "HEALTH_SERVICE"],
    ["I. MUNICIPALIDAD DE HUALPEN", "Departamento de Salud", "MUNICIPAL_HEALTH"],
    ["ILUSTRE MUNICIPALIDAD DE ANGOL", "Secretaria de Planificacion", "MUNICIPALITY"],
    ["CENTRO DE FORMACION TECNICA ESTATAL DE LOS LAGOS", "Rectoria", "HIGHER_EDUCATION"],
    ["DIRECCION GENERAL DE AERONAUTICA CIVIL", "", "PUBLIC_SERVICE"],
  ])("%s / %s -> %s", (organismo, unidad, esperado) => {
    expect(classifyBuyer(organismo, unidad, INITIAL_RULES)).toBe(esperado);
  });

  it("un hospital dependiente de un municipio sigue siendo hospital", () => {
    expect(classifyBuyer("HOSPITAL DE LA MUNICIPALIDAD DE X", "", INITIAL_RULES)).toBe("HOSPITAL");
  });
});

describe("senales de incumbente", () => {
  it("detecta las frases y conserva su forma original", () => {
    const s = detectIncumbentSignals(
      "Continuidad del sistema actual y migración de datos del proveedor actual",
      INITIAL_RULES,
    );
    expect(s).toContain("sistema actual");
    expect(s).toContain("proveedor actual");
    expect(s).toContain("migración");
  });

  it("no repite la misma frase", () => {
    const s = detectIncumbentSignals("migracion, migracion y mas migracion", INITIAL_RULES);
    expect(s.filter((x) => x === "migracion")).toHaveLength(1);
  });

  it("un texto sin senales devuelve lista vacia", () => {
    expect(detectIncumbentSignals("Desarrollo de un sistema nuevo", INITIAL_RULES)).toEqual([]);
  });
});
