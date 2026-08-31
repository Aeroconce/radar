/**
 * Pruebas del parser de fichas de la API (docs/11).
 *
 * El caso que mas importa es la zona horaria: la API entrega hora de pared chilena
 * sin zona, la base guarda UTC, y Chile cambia de huso dos veces al ano. Un desfase
 * fijo de 3 o 4 horas equivoca la mitad del ano, y una fecha de cierre equivocada
 * es una licitacion perdida.
 */
import { describe, expect, it } from "vitest";
import {
  parseAmount,
  parseChileDate,
  parseDuration,
  parseDurationLabel,
  parseProcessType,
  parseTenderDetail,
} from "@/lib/mp/parsers";

/** Hora de pared en Chile de un instante UTC, para leer el resultado. */
const enChile = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

describe("fechas: hora de Chile a UTC", () => {
  it("una fecha de invierno austral usa UTC-4", () => {
    const d = parseChileDate("2026-08-31T17:00:00");
    expect(d?.toISOString()).toBe("2026-08-31T21:00:00.000Z");
  });

  it("una fecha de verano austral usa UTC-3", () => {
    // Chile adelanta el reloj el primer domingo de septiembre.
    const d = parseChileDate("2026-09-24T17:30:00");
    expect(d?.toISOString()).toBe("2026-09-24T20:30:00.000Z");
  });

  it("ida y vuelta: lo guardado se ve en Chile como lo entrego la API", () => {
    for (const wall of [
      "2026-01-15T09:00:00",
      "2026-06-30T23:59:00",
      "2026-09-07T15:30:00",
      "2026-12-24T08:00:00",
    ]) {
      const utc = parseChileDate(wall);
      expect(enChile(utc as Date)).toBe(wall.slice(0, 16).replace("T", " "));
    }
  });

  it("acepta segundos opcionales", () => {
    expect(parseChileDate("2026-08-31T17:00")?.toISOString()).toBe("2026-08-31T21:00:00.000Z");
  });

  it("lo que no es una fecha es nulo", () => {
    for (const v of [null, undefined, "", "sin fecha", 12345, {}]) {
      expect(parseChileDate(v)).toBeNull();
    }
  });
});

describe("tipo de proceso", () => {
  it.each(["L1", "LE", "LP", "LQ", "LR", "LS"])("%s se reconoce", (t) => {
    expect(parseProcessType(t)).toBe(t);
  });

  it("los que el enum no tiene caen en OTHER", () => {
    // CO aparece en los datos reales de la semilla; B2 y E2 existen en el portal.
    for (const t of ["CO", "B2", "E2", "", null, undefined]) {
      expect(parseProcessType(t)).toBe("OTHER");
    }
  });

  it("no distingue mayusculas ni espacios", () => {
    expect(parseProcessType(" le ")).toBe("LE");
  });
});

describe("duracion desde los codigos de la API", () => {
  it.each([
    [30, 2, 30, "dias"],
    [10, 3, 10, "semanas"],
    [36, 4, 36, "meses"],
    [2, 5, 2, "anos"],
  ])("valor %s unidad %s -> %s %s", (valor, unidad, value, unit) => {
    expect(parseDuration(valor, unidad)).toEqual({ durationValue: value, durationUnit: unit });
  });

  it("las unidades 0 y 1 vienen siempre con duracion 0: no informan nada", () => {
    expect(parseDuration(0, 0)).toEqual({ durationValue: null, durationUnit: null });
    expect(parseDuration(0, 1)).toEqual({ durationValue: null, durationUnit: null });
  });

  it("una unidad desconocida no se inventa", () => {
    expect(parseDuration(12, 9)).toEqual({ durationValue: null, durationUnit: null });
  });
});

describe("duracion desde la etiqueta del historico", () => {
  it.each([
    ["36 m", 36, "meses"],
    ["45 d", 45, "dias"],
    ["6 m", 6, "meses"],
  ])("%s -> %s %s", (raw, value, unit) => {
    expect(parseDurationLabel(raw)).toEqual({ durationValue: value, durationUnit: unit });
  });

  it("sin letra de unidad no se asume ninguna", () => {
    // El historico trae "30 " y suponerlo meses inventaria un dato.
    expect(parseDurationLabel("30 ")).toEqual({ durationValue: null, durationUnit: null });
    expect(parseDurationLabel("0 ")).toEqual({ durationValue: null, durationUnit: null });
  });
});

describe("montos", () => {
  it("un monto positivo pasa", () => {
    expect(parseAmount(67_429_000)).toBe(67_429_000);
  });

  it("el cero es ausencia de dato, no un monto", () => {
    // La API devuelve 0 cuando el monto no se publica (Estimacion = 2, docs/03).
    expect(parseAmount(0)).toBeNull();
  });

  it("nulos y basura son nulos", () => {
    for (const v of [null, undefined, "", "sin monto", -5]) {
      expect(parseAmount(v)).toBeNull();
    }
  });
});

describe("ficha completa a campos de Tender", () => {
  const ficha = {
    CodigoExterno: "1607-11-LE26",
    Nombre: "  Sistema informatico de gestion  ",
    Descripcion: "Se requiere una plataforma web",
    Tipo: "LE",
    CodigoEstado: 5,
    MontoEstimado: 12_000_000,
    Moneda: "CLP",
    TiempoDuracionContrato: 24,
    UnidadTiempoDuracionContrato: 4,
    Contrato: "1",
    Fechas: {
      FechaPublicacion: "2026-08-19T12:05:00",
      FechaFinal: "2026-08-31T16:00:00",
      FechaPubRespuestas: "2026-09-01T16:00:00",
      FechaCierre: "2026-09-07T15:30:00",
      FechaEstimadaAdjudicacion: "2026-09-22T23:59:00",
    },
    Comprador: {
      CodigoOrganismo: "1598310",
      NombreOrganismo: "CENTRO DE FORMACION TECNICA",
      NombreUnidad: "Rectoria",
      RegionUnidad: "Region de los Lagos ",
    },
  };

  it("normaliza los campos de texto", () => {
    const f = parseTenderDetail(ficha);
    expect(f.code).toBe("1607-11-LE26");
    expect(f.name).toBe("Sistema informatico de gestion");
    // La API entrega la region con espacio al final.
    expect(f.region).toBe("Region de los Lagos");
  });

  it("resuelve monto, moneda y duracion", () => {
    const f = parseTenderDetail(ficha);
    expect(f.estimatedAmount).toBe(12_000_000);
    expect(f.currency).toBe("CLP");
    expect(f.durationValue).toBe(24);
    expect(f.durationUnit).toBe("meses");
  });

  it("convierte las cinco fechas a UTC", () => {
    const f = parseTenderDetail(ficha);
    expect(f.publishedAt?.toISOString()).toBe("2026-08-19T16:05:00.000Z");
    expect(f.closesAt?.toISOString()).toBe("2026-09-07T18:30:00.000Z");
    expect(f.awardEstimatedAt).not.toBeNull();
  });

  it("una ficha vacia no revienta", () => {
    const f = parseTenderDetail({});
    expect(f.code).toBe("");
    expect(f.processType).toBe("OTHER");
    expect(f.currency).toBe("CLP");
    expect(f.closesAt).toBeNull();
    expect(f.estimatedAmount).toBeNull();
  });

  it("no clasifica: eso es del motor de afinidad", () => {
    const f = parseTenderDetail(ficha) as Record<string, unknown>;
    expect(f.vertical).toBeUndefined();
    expect(f.affinityScore).toBeUndefined();
  });
});
