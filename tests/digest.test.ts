/**
 * Secciones del resumen de los lunes (docs/17, D-51), con datos sinteticos.
 */
import { describe, expect, it } from "vitest";
import { casiEntran, entraronPorPoco, esLunes, MAX_LINEAS } from "@/lib/notifications/digest";
import { renderNotice } from "@/lib/notifications/email";

describe("es lunes en Chile", () => {
  it("un lunes al mediodia lo es", () => {
    expect(esLunes(new Date("2026-09-14T15:00:00.000Z"))).toBe(true);
  });

  it("el borde se mide en Chile, no en UTC", () => {
    // 03:30 UTC del lunes son las 00:30 del lunes en Chile (UTC-3 en septiembre).
    expect(esLunes(new Date("2026-09-14T03:30:00.000Z"))).toBe(true);
    // 02:30 UTC del lunes todavia son las 23:30 del domingo en Chile.
    expect(esLunes(new Date("2026-09-14T02:30:00.000Z"))).toBe(false);
  });

  it("los otros dias no", () => {
    expect(esLunes(new Date("2026-09-11T15:00:00.000Z"))).toBe(false);
  });
});

describe("casi entran", () => {
  const vertical = (name: string) => (/document/i.test(name) ? "DOCUMENT_MGMT" : "OTHER");
  const vistas = [
    { code: "A", name: "Gestor documental", lastScore: 2, selected: false },
    { code: "B", name: "Sistema web", lastScore: 1, selected: false },
    { code: "C", name: "Otra cosa", lastScore: 0, selected: false },
    { code: "D", name: "Ya entro", lastScore: 2, selected: true },
    { code: "E", name: "Muy alta", lastScore: 5, selected: false },
  ];

  it("toma las no seleccionadas entre umbral-2 y umbral-1, ordenadas por puntaje", () => {
    const r = casiEntran(vistas, 3, vertical);
    expect(r.map((x) => x.code)).toEqual(["A", "B"]);
    expect(r[0]).toEqual({ code: "A", name: "Gestor documental", score: 2, vertical: "DOCUMENT_MGMT", tags: [] });
  });

  it("respeta el tope", () => {
    const muchas = Array.from({ length: 40 }, (_, i) => ({ code: `X${i}`, name: "n", lastScore: 2, selected: false }));
    expect(casiEntran(muchas, 3, vertical)).toHaveLength(MAX_LINEAS);
  });
});

describe("entraron por poco", () => {
  const fichas = [
    { code: "N1", name: "Nueva justa", affinityScore: 3, vertical: "WEB_DEVELOPMENT", structuralTags: ["canon ok"] },
    { code: "N2", name: "Nueva un poco mas", affinityScore: 4, vertical: "OTHER", structuralTags: [] },
    { code: "N3", name: "Nueva alta", affinityScore: 9, vertical: "OTHER", structuralTags: [] },
    { code: "R1", name: "Revisada justa", affinityScore: 3, vertical: "OTHER", structuralTags: [], reviewStatus: "DISCARDED" },
  ];

  it("toma las nuevas entre umbral y umbral+1, con sus etiquetas", () => {
    const r = entraronPorPoco(fichas, 3);
    expect(r.map((x) => x.code)).toEqual(["N2", "N1"]);
    expect(r[1].tags).toEqual(["canon ok"]);
  });
});

describe("el resumen de los lunes lleva las dos secciones (D-51)", () => {
  const base = { counts: { nuevas: 4, enRevision: 2, viables: 1 }, closingThisWeek: [] };
  const casi = [{ code: "1-1-LE26", name: "Gestor documental comunal", score: 2, vertical: "DOCUMENT_MGMT", tags: [] }];
  const poco = [{ code: "2-2-LP26", name: "Plataforma justa", score: 3, vertical: "WEB_DEVELOPMENT", tags: ["canon ok", "LR"] }];

  it("con secciones, las muestra en HTML y en texto, con codigo, puntaje, vertical y etiquetas", () => {
    const c = renderNotice("DAILY_DIGEST", { ...base, casiEntran: casi, entraronPorPoco: poco });
    expect(c?.html).toContain("Casi entran");
    expect(c?.html).toContain("1-1-LE26");
    expect(c?.html).toContain("Entraron por poco");
    expect(c?.html).toContain("2-2-LP26");
    expect(c?.html).toContain("canon ok");
    expect(c?.text).toContain("Casi entran");
    expect(c?.text).toContain("2-2-LP26 · Plataforma justa (3, Desarrollo web y plataformas · canon ok, LR)");
  });

  it("sin secciones (los otros dias) no aparecen", () => {
    const c = renderNotice("DAILY_DIGEST", base);
    expect(c?.html).not.toContain("Casi entran");
    expect(c?.text).not.toContain("Entraron por poco");
  });

  it("una seccion vacia el lunes lo dice, en vez de desaparecer", () => {
    const c = renderNotice("DAILY_DIGEST", { ...base, casiEntran: [], entraronPorPoco: poco });
    expect(c?.html).toContain("Casi entran");
    expect(c?.html).toContain("ninguna a un paso del umbral");
  });
});
