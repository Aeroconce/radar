/**
 * Cliente de la API publica de Mercado Publico (docs/03, RN-01).
 *
 * La API castiga las peticiones seguidas: con ticket propio, dos llamadas a menos
 * de ~3 segundos devuelven el codigo 10500 con HTTP 200. Por eso el cliente serializa
 * todo en una cola de un solo consumidor y espera `minIntervalMs` entre llamadas.
 * No es una optimizacion opcional: sin eso el barrido falla.
 *
 * Las dependencias de tiempo y de red se inyectan para poder probar el ritmo y los
 * reintentos sin llamadas reales ni esperas de verdad (docs/11).
 */
import pLimit from "p-limit";

export const MP_BASE_URL = "https://api.mercadopublico.cl/servicios/v1/publico/";

/** La API respondio 10500: hay peticiones demasiado seguidas. */
export class RateLimited extends Error {
  constructor(message = "La API pidio esperar (codigo 10500)") {
    super(message);
    this.name = "RateLimited";
  }
}

/** El codigo consultado no existe o la respuesta vino sin listado. */
export class NotFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFound";
  }
}

/** Cualquier otra falla de la API: HTTP no exitoso, cuerpo ilegible, red caida. */
export class Upstream extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "Upstream";
  }
}

/** Codigo con el que la API pide bajar el ritmo (docs/03). */
export const RATE_LIMIT_CODE = 10500;

/**
 * Esperas antes de cada reintento: 5, 8, 11 y 14 segundos (docs/03).
 *
 * Son cuatro esperas, o sea cuatro reintentos y cinco llamadas en total. docs/03
 * dice "(4 intentos)", que leido como cuatro llamadas dejaria la espera de 14 s
 * sin usar nunca; se toma como cuatro reintentos para que las cuatro sirvan.
 */
export const RETRY_DELAYS_MS = [5_000, 8_000, 11_000, 14_000];

export interface MpResponse<T> {
  Cantidad?: number;
  FechaCreacion?: string;
  Listado?: T[];
  Codigo?: number;
  Mensaje?: string;
}

export interface MpClientOptions {
  ticket: string;
  /** Minimo entre llamadas. Por defecto 3.500 ms (RN-01). */
  minIntervalMs?: number;
  /** Cuantos reintentos ante 10500, sin contar la llamada inicial. Por defecto 4. */
  maxRetries?: number;
  retryDelaysMs?: number[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Conteos para `JobRun.counters` (docs/05). */
export interface MpCounters {
  apiCalls: number;
  retries: number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MpClient {
  private readonly ticket: string;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly retryDelaysMs: number[];
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  /** Un solo consumidor: la API no tolera llamadas en paralelo (docs/03). */
  private readonly queue = pLimit(1);
  /**
   * `null` mientras no haya habido ninguna llamada. No sirve un 0 de centinela:
   * choca con una marca de tiempo legitima de 0, que es lo que devuelve un reloj
   * inyectado en pruebas o uno monotono recien arrancado.
   */
  private lastCallAt: number | null = null;

  readonly counters: MpCounters = { apiCalls: 0, retries: 0 };

  constructor(options: MpClientOptions) {
    if (!options.ticket) throw new Error("Falta MP_API_TICKET (docs/01).");
    this.ticket = options.ticket;
    this.minIntervalMs = options.minIntervalMs ?? 3_500;
    this.maxRetries = options.maxRetries ?? 4;
    this.retryDelaysMs = options.retryDelaysMs ?? RETRY_DELAYS_MS;
    this.baseUrl = options.baseUrl ?? MP_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
  }

  private url(path: string, params: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("ticket", this.ticket);
    return url.toString();
  }

  /** Espera lo que falte para respetar el intervalo minimo desde la ultima llamada. */
  private async waitForSlot(): Promise<void> {
    if (this.lastCallAt === null) return;
    const pending = this.minIntervalMs - (this.now() - this.lastCallAt);
    if (pending > 0) await this.sleep(pending);
  }

  private async callOnce<T>(path: string, params: Record<string, string>): Promise<MpResponse<T>> {
    await this.waitForSlot();

    let response: Response;
    try {
      response = await this.fetchImpl(this.url(path, params));
    } catch (e) {
      this.lastCallAt = this.now();
      throw new Upstream("No se pudo contactar la API", e);
    }
    this.lastCallAt = this.now();
    this.counters.apiCalls++;

    if (!response.ok) {
      throw new Upstream(`La API respondio HTTP ${response.status}`);
    }

    let body: MpResponse<T>;
    try {
      body = (await response.json()) as MpResponse<T>;
    } catch (e) {
      throw new Upstream("La API devolvio un cuerpo ilegible", e);
    }

    // El 10500 llega con HTTP 200: hay que mirar el cuerpo, no el estado (docs/03).
    if (body.Codigo === RATE_LIMIT_CODE) throw new RateLimited(body.Mensaje);

    return body;
  }

  /**
   * Una llamada, con reintentos solo ante 10500 y esperas crecientes.
   *
   * Un `Upstream` no se reintenta: si la API esta caida o el cuerpo viene roto,
   * insistir gasta cuota y no arregla nada. El barrido lo anota y sigue (docs/05).
   */
  private async request<T>(path: string, params: Record<string, string>): Promise<MpResponse<T>> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.callOnce<T>(path, params);
      } catch (e) {
        if (!(e instanceof RateLimited)) throw e;
        lastError = e;
        if (attempt === this.maxRetries) break;
        this.counters.retries++;
        await this.sleep(this.retryDelaysMs[attempt] ?? this.retryDelaysMs.at(-1) ?? 14_000);
      }
    }

    throw lastError;
  }

  private enqueue<T>(path: string, params: Record<string, string>): Promise<MpResponse<T>> {
    return this.queue(() => this.request<T>(path, params));
  }

  /** Todas las activas del dia. Una sola llamada, ~4.600 registros (docs/03). */
  async getActive<T = ActiveListing>(): Promise<T[]> {
    const body = await this.enqueue<T>("licitaciones.json", { estado: "activas" });
    return body.Listado ?? [];
  }

  /** Ficha completa de una licitacion (RF-02). */
  async getTender<T = unknown>(code: string): Promise<T> {
    const body = await this.enqueue<T>("licitaciones.json", { codigo: code });
    const first = body.Listado?.[0];
    if (!first) throw new NotFound(`La API no devolvio ficha para ${code}`);
    return first;
  }

  /** Adjudicadas cuyo evento cayo en esa fecha; alimentan el historial de la ficha (RF-05). */
  async getAwardedOn<T = ActiveListing>(date: Date): Promise<T[]> {
    const body = await this.enqueue<T>("licitaciones.json", {
      fecha: formatApiDate(date),
      estado: "adjudicada",
    });
    return body.Listado ?? [];
  }

  /** Los 899 organismos compradores, para clasificar (docs/04). */
  async getBuyers<T = Buyer>(): Promise<T[]> {
    const body = await this.enqueue<T>("Empresas/BuscarComprador", {});
    return body.Listado ?? [];
  }
}

/** La API espera las fechas como ddmmaaaa (docs/03). */
export function formatApiDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}${m}${date.getFullYear()}`;
}

/** Lo que trae el listado de activas: solo estos cuatro campos (docs/03). */
export interface ActiveListing {
  CodigoExterno: string;
  Nombre: string;
  CodigoEstado?: number;
  FechaCierre?: string | null;
}

export interface Buyer {
  CodigoEmpresa: string;
  NombreEmpresa: string;
}
