/**
 * Pruebas de los filtros compartidos del tablero (RF-04, RF-11).
 *
 * El tablero y la exportacion usan el mismo filtro; aqui se prueba que la URL
 * se lea bien y que cada tramo de monto arme el where correcto. La parte con
 * base (la busqueda con unaccent) se prueba a mano.
 */
import { describe, expect, it } from "vitest";
import { parseFiltros, whereTablero, whereVisibles, whereVivas } from "@/lib/tablero-filtros";

/** Reloj fijo: el filtro de cerradas compara contra la hora que se le pasa. */
const AHORA = new Date("2026-09-11T15:00:00.000Z");
const VIVAS = whereVivas(AHORA);

describe("parseFiltros", () => {
  it("lee todos los parametros de la URL", () => {
    const f = parseFiltros({
      q: " gestion ",
      estado: "NEW,VIABLE",
      vertical: "WEB_DEVELOPMENT",
      comprador: "HOSPITAL",
      proceso: "LE",
      region: "Región del Biobío",
      monto: "10-50",
    });
    expect(f).toEqual({
      q: "gestion",
      estados: ["NEW", "VIABLE"],
      vertical: "WEB_DEVELOPMENT",
      comprador: "HOSPITAL",
      proceso: "LE",
      region: "Región del Biobío",
      monto: "10-50",
      bajoUmbral: false,
      cerradas: false,
    });
  });

  it("sin parametros solo oculta las que estan bajo el umbral y las cerradas (D-42, D-46, D-50)", async () => {
    const f = parseFiltros({});
    expect(f.estados).toEqual([]);
    expect(await whereTablero(f, 3, AHORA)).toEqual({ affinityScore: { gte: 3 }, ...VIVAS });
  });

  it("whereVisibles es exactamente el tablero sin casillas, para que los avisos cuenten lo mismo (D-52)", async () => {
    expect(whereVisibles(3, AHORA)).toEqual(await whereTablero(parseFiltros({}), 3, AHORA));
    expect(whereVisibles(5, AHORA)).toEqual(await whereTablero(parseFiltros({}), 5, AHORA));
  });

  it("usa el umbral vigente de Setting, no un numero fijo", async () => {
    expect((await whereTablero(parseFiltros({}), 5, AHORA)).affinityScore).toEqual({ gte: 5 });
  });

  it("las dos casillas quitan sus restricciones y nada mas", async () => {
    // Se ocultan, no se descartan: con las casillas vuelven todas, con su estado intacto.
    expect(await whereTablero(parseFiltros({ bajoumbral: "1" }), 3, AHORA)).toEqual({ ...VIVAS });
    expect(await whereTablero(parseFiltros({ cerradas: "1" }), 3, AHORA)).toEqual({ affinityScore: { gte: 3 } });
    expect(await whereTablero(parseFiltros({ bajoumbral: "1", cerradas: "1" }), 3, AHORA)).toEqual({});
  });

  it("una cerrada se ve igual si tiene oferta presentada (D-50)", () => {
    // Ofertadas, adjudicadas y perdidas se siguen: hay una oferta de por medio.
    const w = whereVivas(AHORA);
    expect(w.OR?.[0]).toEqual({ reviewStatus: { in: ["SUBMITTED", "AWARDED", "LOST"] } });
    // Lo demas exige portal Publicada (o sin dato) y cierre no vencido (o sin fecha).
    expect(w.OR?.[1]).toEqual({
      AND: [
        { OR: [{ portalStatus: 5 }, { portalStatus: null }] },
        { OR: [{ closesAt: null }, { closesAt: { gte: AHORA } }] },
      ],
    });
  });
});

describe("whereTablero", () => {
  it("cada tramo de monto arma su rango", async () => {
    expect((await whereTablero(parseFiltros({ monto: "10-50" }), 3, AHORA)).estimatedAmount).toEqual({
      gt: 10_000_000,
      lte: 50_000_000,
    });
    expect((await whereTablero(parseFiltros({ monto: "sobre-200" }), 3, AHORA)).estimatedAmount).toEqual({
      gt: 200_000_000,
    });
  });

  it("sin monto publicado filtra por nulo, que RF-04 pide como filtro propio", async () => {
    expect((await whereTablero(parseFiltros({ monto: "sin-monto" }), 3, AHORA)).estimatedAmount).toBeNull();
  });

  it("un tramo inventado en la URL no filtra en vez de reventar", async () => {
    expect(await whereTablero(parseFiltros({ monto: "gigante" }), 3, AHORA)).toEqual({ affinityScore: { gte: 3 }, ...VIVAS });
  });

  it("combina facetas sin pisarse", async () => {
    const w = await whereTablero(parseFiltros({ comprador: "HOSPITAL", proceso: "LE", region: "X" }), 3, AHORA);
    expect(w).toEqual({ buyerType: "HOSPITAL", processType: "LE", region: "X", affinityScore: { gte: 3 }, ...VIVAS });
  });
});
