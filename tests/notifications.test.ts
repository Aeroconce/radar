/**
 * Pruebas de las notificaciones (docs/11).
 *
 * Se prueba lo que se puede probar sin enviar: que las cinco plantillas se armen,
 * que no filtren datos que no corresponden, y que el texto plano acompane siempre
 * al HTML. El envio en si lo cubre la prueba manual contra Resend.
 */
import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatAmount,
  formatDate,
  portalUrl,
  renderNotice,
  tenderUrl,
  truncate,
} from "@/lib/notifications/email";
import type { NotificationType } from "@/generated/prisma/enums";

const TYPES: NotificationType[] = [
  "NEW_HIGH_AFFINITY",
  "CLOSING_SOON",
  "QUESTIONS_CLOSING",
  "AWARD_PUBLISHED",
  "DAILY_DIGEST",
];

const payload = {
  code: "1607-11-LE26",
  name: "Sistema informático de gestión documental",
  organism: "HOSPITAL CLINICO METROPOLITANO",
  closesAt: "2026-09-07T18:30:00.000Z",
  amount: 12_000_000,
  score: 9,
  status: "Viable",
  days: 3,
  winner: "IMPACTE SPA",
  awarded: 67_429_000,
  counts: { nuevas: 4, enRevision: 2, viables: 1 },
  closingThisWeek: [{ code: "1-1-LE26", name: "Plataforma web", closesAt: "2026-09-05T18:00:00.000Z" }],
};

describe("las cinco plantillas de docs/08", () => {
  it.each(TYPES)("%s se arma", (type) => {
    const c = renderNotice(type, payload);
    expect(c).not.toBeNull();
    expect(c?.subject.length).toBeGreaterThan(0);
    expect(c?.html.length).toBeGreaterThan(0);
    expect(c?.text.length).toBeGreaterThan(0);
  });

  it.each(TYPES)("%s siempre trae alternativa en texto plano", (type) => {
    const c = renderNotice(type, payload);
    // Sin texto plano, los clientes que no muestran HTML reciben un correo vacio.
    expect(c?.text).toContain("RADAR DE LICITACIONES");
    expect(c?.text).not.toContain("<div");
  });

  it("un tipo sin plantilla devuelve null en vez de un correo a medias", () => {
    expect(renderNotice("INVENTADO" as NotificationType, payload)).toBeNull();
  });
});

describe("contenido de los avisos", () => {
  it("el aviso de afinidad lleva los datos que permiten decidir sin abrir la ficha", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", payload);
    for (const dato of ["Sistema informático", "HOSPITAL CLINICO", "Afinidad", "1607-11-LE26"]) {
      expect(c?.html).toContain(dato);
    }
  });

  it("el asunto abre con la urgencia, no con una etiqueta generica", () => {
    // El asunto se lee en la bandeja sin abrir: el plazo es lo que decide si se abre.
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, days: 3 });
    expect(c?.subject).toMatch(/^Cierra en 3 días · /);
  });

  it("explica por que aparecio, con el puntaje en su escala", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, score: 16, threshold: 8 });
    // Un "16" suelto no dice nada; contra el umbral si.
    expect(c?.html).toContain("Por qué apareció");
    expect(c?.html).toContain("de un umbral de 8");
  });

  it("muestra los terminos que coincidieron", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", {
      ...payload,
      matchedTerms: ["gestión documental", "sistema"],
    });
    expect(c?.html).toContain("gestión documental");
    expect(c?.text).toContain("Coincidencias:");
  });

  it("incluye la descripcion de la licitacion, recortada", () => {
    const larga = "Se requiere ".repeat(60);
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, description: larga });
    expect(c?.html).toContain("Se requiere");
    expect(c?.html).toContain("…");
  });

  it("destaca las senales de oportunidad (D-40)", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, opportunitySignals: ["segundo llamado"] });
    expect(c?.html).toContain("oportunidad");
    expect(c?.html).toContain("segundo llamado");
    expect(c?.text).toContain("segundo llamado");
  });

  it("advierte cuando hay senales de proveedor instalado", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, incumbentSignals: ["continuidad"] });
    expect(c?.html).toContain("proveedor instalado");
    expect(c?.html).toContain("continuidad");
  });

  it("ofrece el enlace al portal ademas de la ficha", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", payload);
    expect(c?.html).toContain(portalUrl("1607-11-LE26"));
  });

  it("el acta publicada informa ganador y monto", () => {
    const c = renderNotice("AWARD_PUBLISHED", payload);
    expect(c?.html).toContain("IMPACTE SPA");
    expect(c?.text).toContain("Ganador");
  });

  it("el resumen sin cierres lo dice, en vez de mostrar una tabla vacia", () => {
    const c = renderNotice("DAILY_DIGEST", { ...payload, closingThisWeek: [] });
    expect(c?.html).toContain("Ninguna licitación del tablero cierra esta semana");
  });

  it("el asunto del resumen trae los numeros, para leerlo sin abrirlo", () => {
    const c = renderNotice("DAILY_DIGEST", payload);
    expect(c?.subject).toContain("4 nuevas");
    expect(c?.subject).toContain("1 viables");
  });

  it("todo aviso de una licitacion enlaza a su ficha", () => {
    const c = renderNotice("CLOSING_SOON", payload);
    expect(c?.html).toContain(tenderUrl("1607-11-LE26"));
  });

  it("nunca se filtran credenciales ni el ticket de la API (docs/09)", () => {
    for (const type of TYPES) {
      const c = renderNotice(type, payload);
      const todo = `${c?.subject} ${c?.html} ${c?.text}`.toLowerCase();
      for (const secreto of ["ticket", "re_", "api_key", "password", "secret"]) {
        expect(todo).not.toContain(secreto);
      }
    }
  });

  it("escapa el HTML de los nombres, que vienen del portal", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, name: 'Sistema <script>alert("x")</script>' });
    expect(c?.html).not.toContain("<script>");
    expect(c?.html).toContain("&lt;script&gt;");
  });
});

describe("urgencia del plazo (docs/06)", () => {
  it.each([
    [1, "cierra en 1 día"],
    [2, "cierra en 2 días"],
    [4, "cierra en 4 días"],
    [12, "cierra en 12 días"],
    [0, "cierra hoy"],
  ])("con %s dias dice: %s", (days, texto) => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, days });
    expect(c?.html).toContain(texto);
  });

  it("una licitacion ya cerrada se dice cerrada", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, days: -2 });
    expect(c?.html).toContain("cerrada");
  });

  it("sin fecha de cierre no se inventa un plazo", () => {
    const c = renderNotice("NEW_HIGH_AFFINITY", { ...payload, days: undefined, closesAt: null });
    expect(c?.html).toContain("sin fecha de cierre");
  });
});

describe("ayudantes", () => {
  it("daysUntil cuenta dias completos", () => {
    const desde = new Date("2026-09-01T12:00:00Z");
    expect(daysUntil("2026-09-04T12:00:00Z", desde)).toBe(3);
    expect(daysUntil(null, desde)).toBeNull();
    expect(daysUntil("no es fecha", desde)).toBeNull();
  });

  it("truncate corta en un espacio, no a mitad de palabra", () => {
    const r = truncate("uno dos tres cuatro cinco seis", 12);
    expect(r.endsWith("…")).toBe(true);
    expect(r).not.toContain("cuatr…");
  });

  it("truncate deja intacto lo que ya cabe", () => {
    expect(truncate("corto", 100)).toBe("corto");
  });
});

describe("formato en espanol neutro (RN-04)", () => {
  it("los montos van con separador de miles y signo", () => {
    expect(formatAmount(1_234_567)).toContain("1.234.567");
  });

  it("un monto ausente se dice, no se muestra como cero", () => {
    expect(formatAmount(null)).toBe("no publicado");
    expect(formatAmount(undefined)).toBe("no publicado");
  });

  it("las fechas se muestran en hora de Chile", () => {
    // 2026-09-07T18:30Z son las 15:30 del 7 en Chile: no debe correrse de dia.
    expect(formatDate("2026-09-07T18:30:00.000Z")).toContain("7 de septiembre");
  });

  it("una fecha invalida no revienta la plantilla", () => {
    expect(formatDate("no es fecha")).toBe("sin fecha");
    expect(formatDate(null)).toBe("sin fecha");
  });
});

// ------------------------------------------------- resumen diario y RN-07

describe("resumen diario con estado del barrido (RN-07)", () => {
  const base = {
    counts: { nuevas: 4, enRevision: 2, viables: 1 },
    closingThisWeek: [],
  };

  it("un barrido correcto se menciona sin alarma", () => {
    const c = renderNotice("DAILY_DIGEST", {
      ...base,
      sweep: { finishedAt: "2026-08-31T06:15:00.000Z", ok: true },
    });
    expect(c?.html).toContain("sin errores");
    expect(c?.html).not.toContain("falló");
  });

  it("un barrido fallido va en rojo y con verbo", () => {
    // Es el unico lugar donde el equipo se entera del fallo (docs/08).
    const c = renderNotice("DAILY_DIGEST", {
      ...base,
      sweep: { finishedAt: "2026-08-31T06:15:00.000Z", ok: false },
    });
    expect(c?.html).toContain("falló");
    expect(c?.html).toContain("desactualizado");
    expect(c?.text).toContain("FALLÓ");
  });

  it("sin dato del barrido, no se inventa uno", () => {
    const c = renderNotice("DAILY_DIGEST", base);
    expect(c?.html).not.toContain("barrido");
  });

  it("el pie ya no promete la pantalla de Configuración (D-27)", () => {
    const c = renderNotice("DAILY_DIGEST", base);
    expect(c?.html).not.toContain("Configuración");
  });
});
