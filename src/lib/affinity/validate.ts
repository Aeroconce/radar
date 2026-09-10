/**
 * Validacion de lo que se edita en la pantalla de reglas (RF-09).
 *
 * El motor ya ignora una regla cuyo patron no compila (`compile` en rules.ts):
 * una expresion mal escrita no puede voltear el barrido. Pero ignorarla en
 * silencio es peor que rechazarla al guardar, porque desde la interfaz se ve
 * activa y no hace nada. Aqui se rechaza antes de escribirla.
 *
 * Vive aparte de `rules.ts` para que el motor siga sin saber que existe una
 * interfaz, y para poder probarse sin base de datos.
 */
import type { BuyerType, Vertical } from "@/generated/prisma/enums";
import { RULE_KINDS } from "./rules";

export const VERTICALES_VALIDAS: Vertical[] = [
  "APPOINTMENTS",
  "FIXED_ASSETS",
  "DOCUMENT_MGMT",
  "QUALITY_ACCREDITATION",
  "ATTENDANCE",
  "MAINTENANCE",
  "PHARMA_LOGISTICS",
  "WEB_DEVELOPMENT",
  "OTHER",
];

export const COMPRADORES_VALIDOS: BuyerType[] = [
  "HOSPITAL",
  "HEALTH_SERVICE",
  "MUNICIPAL_HEALTH",
  "MUNICIPALITY",
  "HIGHER_EDUCATION",
  "PUBLIC_SERVICE",
  "OTHER",
];

export const TIPOS_PROCESO_VALIDOS = ["L1", "LE", "LP", "LQ", "LR", "LS"];

/**
 * Tope de peso.
 *
 * No es una restriccion tecnica: es para que nadie desactive el umbral de hecho
 * poniendo 999 en una regla generica. Las de docs/04 van de 2 a 6.
 */
export const PESO_MAXIMO = 20;

/** Lo que la pantalla manda para crear o modificar una regla. */
export interface ReglaEditable {
  id?: string;
  kind: string;
  pattern: string;
  weight: number;
  vertical?: Vertical | null;
  buyerType?: BuyerType | null;
  active?: boolean;
}

export interface Problema {
  campo: "kind" | "pattern" | "weight" | "vertical" | "buyerType" | "general";
  mensaje: string;
}

/**
 * Longitud maxima del patron.
 *
 * Las reglas de docs/04 llegan a 400 caracteres, asi que el limite es holgado.
 * Existe para que un pegado accidental no termine en la tabla que el barrido lee
 * cuatro mil veces por ciclo.
 */
export const PATRON_MAXIMO = 1000;

export function validarRegla(r: ReglaEditable): Problema[] {
  const problemas: Problema[] = [];

  if (!(Object.values(RULE_KINDS) as string[]).includes(r.kind)) {
    problemas.push({ campo: "kind", mensaje: "Ese tipo de regla no existe." });
    return problemas; // sin tipo valido, lo demas no se puede juzgar
  }

  const patron = r.pattern.trim();
  if (patron.length === 0) {
    problemas.push({ campo: "pattern", mensaje: "Escribe la expresión." });
  } else if (patron.length > PATRON_MAXIMO) {
    problemas.push({
      campo: "pattern",
      mensaje: `La expresión no puede pasar de ${PATRON_MAXIMO} caracteres.`,
    });
  } else {
    try {
      new RegExp(patron, "i");
    } catch (e) {
      problemas.push({
        campo: "pattern",
        mensaje: `La expresión no es válida: ${e instanceof Error ? e.message : "error de sintaxis"}`,
      });
    }
    // El motor normaliza el texto antes de evaluar, asi que un patron con tildes
    // no coincide nunca. Es el error mas facil de cometer y el mas dificil de ver.
    if (/[áéíóúñü]/i.test(patron)) {
      problemas.push({
        campo: "pattern",
        mensaje: "Escríbela sin tildes ni eñes: el texto se compara sin ellas.",
      });
    }
  }

  if (!Number.isInteger(r.weight)) {
    problemas.push({ campo: "weight", mensaje: "El peso tiene que ser un número entero." });
  } else if (Math.abs(r.weight) > PESO_MAXIMO) {
    problemas.push({ campo: "weight", mensaje: `El peso va entre −${PESO_MAXIMO} y ${PESO_MAXIMO}.` });
  } else if (r.kind === RULE_KINDS.KEYWORD && r.weight <= 0) {
    problemas.push({ campo: "weight", mensaje: "Una palabra clave suma: su peso tiene que ser positivo." });
  } else if (r.kind === RULE_KINDS.EXCLUSION && r.weight >= 0) {
    problemas.push({ campo: "weight", mensaje: "Una exclusión resta: su peso tiene que ser negativo." });
  }

  if (r.kind === RULE_KINDS.KEYWORD && !VERTICALES_VALIDAS.includes(r.vertical as Vertical)) {
    problemas.push({ campo: "vertical", mensaje: "Elige la vertical que asigna esta palabra clave." });
  }
  if (r.kind === RULE_KINDS.BUYER_PATTERN && !COMPRADORES_VALIDOS.includes(r.buyerType as BuyerType)) {
    problemas.push({ campo: "buyerType", mensaje: "Elige el tipo de comprador que asigna este patrón." });
  }

  return problemas;
}

export interface ParametrosEditables {
  affinityThreshold: number;
  highAffinityThreshold: number;
  maxAmount: number;
  processTypes: string[];
}

export function validarParametros(p: ParametrosEditables): Problema[] {
  const problemas: Problema[] = [];

  if (!Number.isInteger(p.affinityThreshold) || p.affinityThreshold < 1) {
    problemas.push({ campo: "general", mensaje: "El umbral de selección tiene que ser 1 o más." });
  }
  if (!Number.isInteger(p.highAffinityThreshold) || p.highAffinityThreshold < 1) {
    problemas.push({ campo: "general", mensaje: "El umbral de aviso tiene que ser 1 o más." });
  }
  // Un umbral de aviso bajo el de seleccion avisaria de todo lo que entra, que es
  // lo mismo que no avisar: el correo se vuelve ruido y se deja de leer.
  if (
    Number.isInteger(p.affinityThreshold) &&
    Number.isInteger(p.highAffinityThreshold) &&
    p.highAffinityThreshold < p.affinityThreshold
  ) {
    problemas.push({
      campo: "general",
      mensaje: "El umbral de aviso no puede ser menor que el de selección: avisaría de todas.",
    });
  }
  if (!Number.isInteger(p.maxAmount) || p.maxAmount < 1) {
    problemas.push({ campo: "general", mensaje: "El monto máximo tiene que ser mayor que cero." });
  }
  if (p.processTypes.length === 0) {
    problemas.push({ campo: "general", mensaje: "Deja al menos un tipo de proceso." });
  }
  if (p.processTypes.some((t) => !TIPOS_PROCESO_VALIDOS.includes(t))) {
    problemas.push({ campo: "general", mensaje: "Hay un tipo de proceso que no existe." });
  }

  return problemas;
}
