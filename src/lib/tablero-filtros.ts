/**
 * Los filtros del tablero, en un solo lugar (RF-04, RF-11).
 *
 * El tablero y la exportacion a Excel leen los mismos parametros de la URL y
 * arman el mismo filtro. Si cada uno lo hiciera por su cuenta, el archivo
 * exportado terminaria con otras filas que la pantalla, que es el peor defecto
 * posible de una exportacion: no se nota hasta que alguien compara.
 */
import type { Prisma } from "@/generated/prisma/client";
import type { BuyerType, ProcessType, ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * El filtro de cada tramo. Las etiquetas viven en `tenders.ts`, que el cliente
 * puede importar; este archivo toca Prisma y es solo del servidor.
 *
 * Tramos y no un minimo/maximo libre: las preguntas reales del equipo son de
 * tramo ("las chicas", "las grandes"), y RF-04 pide ademas "sin monto
 * publicado" como filtro propio.
 */
const WHERE_MONTO: Record<string, Prisma.TenderWhereInput> = {
  "hasta-10": { estimatedAmount: { gt: 0, lte: 10_000_000 } },
  "10-50": { estimatedAmount: { gt: 10_000_000, lte: 50_000_000 } },
  "50-200": { estimatedAmount: { gt: 50_000_000, lte: 200_000_000 } },
  "sobre-200": { estimatedAmount: { gt: 200_000_000 } },
  "sin-monto": { estimatedAmount: null },
};

export interface FiltrosTablero {
  q: string;
  estados: ReviewStatus[];
  vertical: string;
  comprador: string;
  proceso: string;
  region: string;
  monto: string;
}

export function parseFiltros(sp: Record<string, string | undefined>): FiltrosTablero {
  return {
    q: (sp.q ?? "").trim(),
    estados: (sp.estado ?? "").split(",").filter(Boolean) as ReviewStatus[],
    vertical: sp.vertical ?? "",
    comprador: sp.comprador ?? "",
    proceso: sp.proceso ?? "",
    region: sp.region ?? "",
    monto: sp.monto ?? "",
  };
}

/**
 * El filtro completo, listo para Prisma.
 *
 * Es asincrono por la busqueda: `unaccent` no existe en el API de filtros de
 * Prisma, asi que el texto se resuelve primero a una lista de ids con una
 * consulta cruda y el resto sigue en Prisma, donde se lee.
 */
export async function whereTablero(f: FiltrosTablero): Promise<Prisma.TenderWhereInput> {
  let idsBusqueda: string[] | null = null;
  if (f.q) {
    const filas = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Tender"
      WHERE unaccent(lower(name))            LIKE unaccent(lower(${`%${f.q}%`}))
         OR unaccent(lower("buyerOrganism")) LIKE unaccent(lower(${`%${f.q}%`}))
         OR unaccent(lower(description))     LIKE unaccent(lower(${`%${f.q}%`}))
         OR lower(code)                      LIKE lower(${`%${f.q}%`})
    `;
    idsBusqueda = filas.map((x) => x.id);
  }

  const monto = WHERE_MONTO[f.monto];

  return {
    ...(idsBusqueda !== null ? { id: { in: idsBusqueda } } : {}),
    ...(f.estados.length > 0 ? { reviewStatus: { in: f.estados } } : {}),
    ...(f.vertical ? { vertical: f.vertical as never } : {}),
    ...(f.comprador ? { buyerType: f.comprador as BuyerType } : {}),
    ...(f.proceso ? { processType: f.proceso as ProcessType } : {}),
    ...(f.region ? { region: f.region } : {}),
    ...(monto ?? {}),
  };
}
