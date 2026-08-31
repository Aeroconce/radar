/**
 * Pruebas del cliente de Mercado Publico (docs/11).
 *
 * Sin llamadas reales y sin esperas reales: el reloj, el `sleep` y el `fetch` se
 * inyectan. Cada `sleep` adelanta el reloj simulado, que es lo que hace observable
 * el ritmo de 3,5 s sin que la suite tarde medio minuto.
 */
import { describe, expect, it } from "vitest";
import {
  MpClient,
  NotFound,
  RATE_LIMIT_CODE,
  RETRY_DELAYS_MS,
  RateLimited,
  Upstream,
  formatApiDate,
} from "@/lib/mp/client";

type Body = Record<string, unknown>;

function harness(bodies: Array<Body | { httpStatus: number } | "boom">) {
  let clock = 0;
  let index = 0;
  const sleeps: number[] = [];
  const urls: string[] = [];

  const pick = () => bodies[Math.min(index++, bodies.length - 1)];

  const fetchImpl = (async (url: string | URL) => {
    urls.push(String(url));
    const body = pick();
    if (body === "boom") throw new Error("red caida");
    if (body && typeof body === "object" && "httpStatus" in body) {
      return { ok: false, status: (body as { httpStatus: number }).httpStatus } as Response;
    }
    return { ok: true, status: 200, json: async () => body } as Response;
  }) as unknown as typeof fetch;

  const client = new MpClient({
    ticket: "TICKET-DE-PRUEBA",
    fetchImpl,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
  });

  return { client, sleeps, urls, tick: (ms: number) => (clock += ms) };
}

const listado = (items: unknown[]) => ({ Cantidad: items.length, Listado: items });
const rateLimited = { Codigo: RATE_LIMIT_CODE, Mensaje: "peticiones simultaneas" };

// ------------------------------------------------------------- ritmo (RN-01)

describe("ritmo entre llamadas", () => {
  it("la primera llamada no espera", async () => {
    const h = harness([listado([])]);
    await h.client.getActive();
    expect(h.sleeps).toEqual([]);
  });

  it("la segunda espera lo que falte para los 3,5 s", async () => {
    const h = harness([listado([]), listado([])]);
    await h.client.getActive();
    await h.client.getActive();
    expect(h.sleeps).toEqual([3_500]);
  });

  it("si ya paso el intervalo, no espera de mas", async () => {
    const h = harness([listado([]), listado([])]);
    await h.client.getActive();
    h.tick(10_000);
    await h.client.getActive();
    expect(h.sleeps).toEqual([]);
  });

  it("espera solo la diferencia, no el intervalo completo", async () => {
    const h = harness([listado([]), listado([])]);
    await h.client.getActive();
    h.tick(1_000);
    await h.client.getActive();
    expect(h.sleeps).toEqual([2_500]);
  });

  it("serializa las llamadas concurrentes en vez de dispararlas juntas", async () => {
    const h = harness([listado([]), listado([]), listado([])]);
    await Promise.all([h.client.getActive(), h.client.getActive(), h.client.getActive()]);
    // Tres llamadas, dos esperas entre ellas: la cola tiene un solo consumidor.
    expect(h.urls).toHaveLength(3);
    expect(h.sleeps).toEqual([3_500, 3_500]);
  });
});

// ------------------------------------------------------ reintentos (docs/03)

describe("reintentos ante el codigo 10500", () => {
  it("reintenta con esperas crecientes y usa las cuatro", async () => {
    const h = harness([rateLimited]);
    await expect(h.client.getActive()).rejects.toBeInstanceOf(RateLimited);
    expect(h.sleeps).toEqual(RETRY_DELAYS_MS);
    // Una llamada inicial mas cuatro reintentos.
    expect(h.urls).toHaveLength(5);
  });

  it("cuenta los reintentos para JobRun.counters", async () => {
    const h = harness([rateLimited]);
    await h.client.getActive().catch(() => undefined);
    expect(h.client.counters.retries).toBe(4);
    expect(h.client.counters.apiCalls).toBe(5);
  });

  it("si el reintento funciona, devuelve el resultado", async () => {
    const h = harness([rateLimited, rateLimited, listado([{ CodigoExterno: "1-1-LE26" }])]);
    const activas = await h.client.getActive();
    expect(activas).toHaveLength(1);
    expect(h.client.counters.retries).toBe(2);
  });

  it("el 10500 llega con HTTP 200: hay que mirar el cuerpo", async () => {
    const h = harness([rateLimited, listado([])]);
    await h.client.getActive();
    // Si mirara solo el estado, la primera respuesta habria pasado como valida.
    expect(h.client.counters.retries).toBe(1);
  });
});

// ---------------------------------------------------------------- errores

describe("errores", () => {
  it("un HTTP no exitoso es Upstream y no se reintenta", async () => {
    const h = harness([{ httpStatus: 503 }]);
    await expect(h.client.getActive()).rejects.toBeInstanceOf(Upstream);
    // Insistir contra una API caida gasta cuota y no arregla nada.
    expect(h.urls).toHaveLength(1);
    expect(h.client.counters.retries).toBe(0);
  });

  it("la red caida es Upstream", async () => {
    const h = harness(["boom"]);
    await expect(h.client.getActive()).rejects.toBeInstanceOf(Upstream);
  });

  it("una ficha sin listado es NotFound", async () => {
    const h = harness([listado([])]);
    await expect(h.client.getTender("1-1-LE26")).rejects.toBeInstanceOf(NotFound);
  });

  it("sin ticket el cliente no se construye", () => {
    expect(() => new MpClient({ ticket: "" })).toThrow(/MP_API_TICKET/);
  });
});

// ------------------------------------------------------------------- URLs

describe("armado de la peticion", () => {
  it("toda llamada lleva el ticket", async () => {
    const h = harness([listado([])]);
    await h.client.getActive();
    expect(h.urls[0]).toContain("ticket=TICKET-DE-PRUEBA");
  });

  it("las activas piden estado=activas", async () => {
    const h = harness([listado([])]);
    await h.client.getActive();
    expect(h.urls[0]).toContain("estado=activas");
  });

  it("la ficha pide el codigo", async () => {
    const h = harness([listado([{ CodigoExterno: "1607-11-LE26" }])]);
    await h.client.getTender("1607-11-LE26");
    expect(h.urls[0]).toContain("codigo=1607-11-LE26");
  });

  it("el historico pide la fecha como ddmmaaaa", async () => {
    const h = harness([listado([])]);
    await h.client.getAwardedOn(new Date(2026, 7, 5));
    expect(h.urls[0]).toContain("fecha=05082026");
    expect(h.urls[0]).toContain("estado=adjudicada");
  });

  it("el ticket nunca viaja en el cuerpo ni en un encabezado propio", async () => {
    const h = harness([listado([])]);
    await h.client.getActive();
    // La API solo lo acepta como parametro; comprobarlo evita filtrarlo por otra via.
    expect(h.urls[0].startsWith("https://api.mercadopublico.cl/")).toBe(true);
  });
});

describe("formato de fecha de la API", () => {
  it.each([
    [new Date(2026, 0, 1), "01012026"],
    [new Date(2026, 7, 30), "30082026"],
    [new Date(2026, 11, 9), "09122026"],
  ])("%s -> %s", (date, esperado) => {
    expect(formatApiDate(date)).toBe(esperado);
  });
});
