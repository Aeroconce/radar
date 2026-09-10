/**
 * Pruebas de los filtros compartidos del tablero (RF-04, RF-11).
 *
 * El tablero y la exportacion usan el mismo filtro; aqui se prueba que la URL
 * se lea bien y que cada tramo de monto arme el where correcto. La parte con
 * base (la busqueda con unaccent) se prueba a mano.
 */
import { describe, expect, it } from "vitest";
import { parseFiltros, whereTablero } from "@/lib/tablero-filtros";

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
      negativas: false,
    });
  });

  it("sin parametros solo oculta las de afinidad negativa (D-42)", async () => {
    const f = parseFiltros({});
    expect(f.estados).toEqual([]);
    expect(await whereTablero(f)).toEqual({ affinityScore: { gte: 0 } });
  });

  it("la casilla de negativas quita esa unica restriccion", async () => {
    // Se ocultan, no se descartan: con la casilla vuelven todas, con su estado intacto.
    expect(await whereTablero(parseFiltros({ negativas: "1" }))).toEqual({});
  });
});

describe("whereTablero", () => {
  it("cada tramo de monto arma su rango", async () => {
    expect((await whereTablero(parseFiltros({ monto: "10-50" }))).estimatedAmount).toEqual({
      gt: 10_000_000,
      lte: 50_000_000,
    });
    expect((await whereTablero(parseFiltros({ monto: "sobre-200" }))).estimatedAmount).toEqual({
      gt: 200_000_000,
    });
  });

  it("sin monto publicado filtra por nulo, que RF-04 pide como filtro propio", async () => {
    expect((await whereTablero(parseFiltros({ monto: "sin-monto" }))).estimatedAmount).toBeNull();
  });

  it("un tramo inventado en la URL no filtra en vez de reventar", async () => {
    expect(await whereTablero(parseFiltros({ monto: "gigante" }))).toEqual({ affinityScore: { gte: 0 } });
  });

  it("combina facetas sin pisarse", async () => {
    const w = await whereTablero(parseFiltros({ comprador: "HOSPITAL", proceso: "LE", region: "X" }));
    expect(w).toEqual({ buyerType: "HOSPITAL", processType: "LE", region: "X", affinityScore: { gte: 0 } });
  });
});
