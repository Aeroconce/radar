/**
 * Los avisos de las 08:00 miran lo mismo que el tablero (D-52).
 *
 * El correo del 12-09-2026 decia "14 nuevas" donde la pantalla mostraba 2, y
 * anunciaba el cierre de dos licitaciones que D-49 acababa de sacar: las
 * consultas del worker no aplicaban ni el umbral ni las cerradas. Aqui se
 * prueba que cada filtro de la manana parta del mismo `where` que los chips
 * del tablero. Las consultas con base se prueban a mano (docs/11).
 */
import { describe, expect, it } from "vitest";
import { parseFiltros, whereTablero, whereVivas } from "@/lib/tablero-filtros";
import { filtrosDeLaManana, ventana } from "../worker/jobs/alerts";

/** Las 08:00 de Chile del 12-09-2026, la manana del correo que no calzaba. */
const AHORA = new Date("2026-09-12T11:00:00.000Z");
const UMBRAL = 3;

describe("filtrosDeLaManana (D-52)", () => {
  const f = filtrosDeLaManana(AHORA, UMBRAL);

  it("los conteos del resumen son los chips del tablero, estado por estado", async () => {
    const chips = await whereTablero(parseFiltros({}), UMBRAL, AHORA);
    for (const estado of ["NEW", "IN_REVIEW", "VIABLE"] as const) {
      expect(f.conteo(estado)).toEqual({ ...chips, reviewStatus: estado });
    }
  });

  it("ningun aviso se olvida del umbral ni de las cerradas", () => {
    for (const w of [f.porCerrar, f.foroPorCerrar, f.semana]) {
      expect(w.affinityScore).toEqual({ gte: UMBRAL });
      expect(w.OR).toEqual(whereVivas(AHORA).OR);
    }
  });

  it("los recordatorios de plazo siguen siendo solo de viables y en revision", () => {
    expect(f.porCerrar.reviewStatus).toEqual({ in: ["VIABLE", "IN_REVIEW"] });
    expect(f.porCerrar.closesAt).toEqual({ gte: AHORA, lte: ventana(AHORA, 5).hasta });
    expect(f.foroPorCerrar.reviewStatus).toEqual({ in: ["VIABLE", "IN_REVIEW"] });
    expect(f.foroPorCerrar.questionsUntil).toEqual({ gte: AHORA, lte: ventana(AHORA, 1).hasta });
  });

  it("los cierres de la semana dejan fuera lo descartado y lo que ya cerro", () => {
    expect(f.semana.reviewStatus).toEqual({ in: ["NEW", "IN_REVIEW", "VIABLE", "SUBMITTED"] });
    expect(f.semana.closesAt).toEqual({ gte: AHORA, lte: ventana(AHORA, 7).hasta });
  });

  it("«entraron por poco» conserva las vivas y cambia el umbral por la banda (D-51)", () => {
    expect(f.entraronPorPoco).toEqual({
      ...whereVivas(AHORA),
      reviewStatus: "NEW",
      affinityScore: { gte: UMBRAL, lte: UMBRAL + 1 },
    });
  });

  it("usa el umbral vigente, no un numero fijo", () => {
    expect(filtrosDeLaManana(AHORA, 5).semana.affinityScore).toEqual({ gte: 5 });
    expect(filtrosDeLaManana(AHORA, 5).conteo("NEW").affinityScore).toEqual({ gte: 5 });
  });
});
