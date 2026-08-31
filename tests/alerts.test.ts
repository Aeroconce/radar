/**
 * Pruebas de la tarea de las 08:00 (RF-10, docs/11).
 *
 * La tarea toca la base, asi que aqui se prueban sus decisiones puras: las
 * ventanas de tiempo y la fecha del dedupeKey. Que encole y despache lo cubre
 * la ejecucion real (pnpm worker:avisos).
 */
import { describe, expect, it } from "vitest";
import { fechaChile, ventana } from "../worker/jobs/alerts";

describe("ventana", () => {
  const ahora = new Date("2026-08-31T12:00:00.000Z");

  it("cinco dias para los cierres (docs/08)", () => {
    const v = ventana(ahora, 5);
    expect(v.desde).toEqual(ahora);
    expect(v.hasta).toEqual(new Date("2026-09-05T12:00:00.000Z"));
  });

  it("no mira hacia atras: lo que ya cerro no se avisa", () => {
    const v = ventana(ahora, 1);
    expect(v.desde.getTime()).toBe(ahora.getTime());
  });
});

describe("fechaChile", () => {
  it("usa el dia de Chile, no el del servidor", () => {
    // 02:00 UTC del 1 de septiembre sigue siendo 31 de agosto en Chile (UTC-4).
    expect(fechaChile(new Date("2026-09-01T02:00:00.000Z"))).toBe("2026-08-31");
    // Mediodia UTC ya es el mismo dia en ambos lados.
    expect(fechaChile(new Date("2026-09-01T12:00:00.000Z"))).toBe("2026-09-01");
  });

  it("es estable dentro del mismo dia: un solo resumen diario", () => {
    expect(fechaChile(new Date("2026-08-31T11:00:00.000Z"))).toBe(
      fechaChile(new Date("2026-08-31T23:00:00.000Z")),
    );
  });
});
