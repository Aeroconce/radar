/**
 * Vista previa de un cambio de reglas (RF-09, docs/04).
 *
 * La pregunta que responde: **si guardo esto, que entra y que sale**. Sin ella,
 * editar una regla es a ciegas: el efecto recien se ve dos horas despues, en el
 * barrido siguiente, y para entonces nadie recuerda que se toco.
 *
 * Se calcula sobre `SeenTender` —la ultima lista de activas guardada— y no
 * llamando a la API: la cuota es finita y la respuesta no cambiaria.
 *
 * ## Que texto se puntua
 *
 * `SeenTender` guarda solo el nombre, que es lo unico que trae el listado de
 * activas. Pero el barrido puntua en dos etapas: si el nombre deja el puntaje
 * cerca del umbral, pide la ficha y recalcula con la descripcion (docs/04). Para
 * que la vista previa diga lo mismo que hara el barrido, las que ya estan en
 * `Tender` se puntuan con nombre **y** descripcion, que estan guardadas. Con el
 * nombre solo, media docena de licitaciones del tablero apareceria como "saldria"
 * cuando en realidad entro por su descripcion.
 */
import { evaluate, type Rule, type Thresholds } from "./rules";

/** Una activa a evaluar. `description` solo existe si la licitacion esta en el tablero. */
export interface Candidata {
  code: string;
  name: string;
  description?: string;
  amount?: number | null;
  processType?: string | null;
  /** Ya esta en el tablero. */
  enTablero: boolean;
  /** Alguien la reviso: sacarla del radar tiene mas costo. */
  revisada: boolean;
}

export interface FilaPrevia {
  code: string;
  name: string;
  antes: number;
  despues: number;
  enTablero: boolean;
  revisada: boolean;
}

export interface Comparacion {
  /** Activas evaluadas. */
  activas: number;
  /** Cuantas selecciona la regla vigente. */
  antes: number;
  /** Cuantas seleccionaria la propuesta. */
  despues: number;
  /** Entran con la propuesta y no antes. Recortadas a `MAX_FILAS`. */
  entran: FilaPrevia[];
  /** Salen: las selecciona la vigente y no la propuesta. Recortadas a `MAX_FILAS`. */
  salen: FilaPrevia[];
  /** Cuantas entran en total, antes del recorte. */
  totalEntran: number;
  /** Cuantas salen en total, antes del recorte. */
  totalSalen: number;
  /** De las que salen, cuantas ya tienen una revision escrita. */
  salenRevisadas: number;
}

/** Tope de filas listadas por lado. El conteo total va aparte, para que el recorte se vea. */
export const MAX_FILAS = 60;

/**
 * Compara dos versiones del motor sobre el mismo conjunto de activas.
 *
 * Pura a proposito: recibe las candidatas ya cargadas para poder probarse sin
 * base de datos, y porque el mismo calculo sirve para un cambio de regla y para
 * uno de parametros.
 */
export function comparar(
  candidatas: Candidata[],
  vigente: { rules: Rule[]; thresholds: Thresholds },
  propuesta: { rules: Rule[]; thresholds: Thresholds },
): Comparacion {
  let antes = 0;
  let despues = 0;
  const entran: FilaPrevia[] = [];
  const salen: FilaPrevia[] = [];
  let salenRevisadas = 0;

  for (const c of candidatas) {
    const entrada = {
      text: c.description ? `${c.name} ${c.description}` : c.name,
      amount: c.amount,
      processType: c.processType,
    };

    const a = evaluate(entrada, vigente.rules, vigente.thresholds);
    const d = evaluate(entrada, propuesta.rules, propuesta.thresholds);

    if (a.selected) antes++;
    if (d.selected) despues++;
    if (a.selected === d.selected) continue;

    const fila: FilaPrevia = {
      code: c.code,
      name: c.name,
      antes: a.score,
      despues: d.score,
      enTablero: c.enTablero,
      revisada: c.revisada,
    };

    if (d.selected) entran.push(fila);
    else {
      salen.push(fila);
      if (c.revisada) salenRevisadas++;
    }
  }

  // Primero lo que mas se movio: es donde esta la sorpresa.
  const porSalto = (x: FilaPrevia, y: FilaPrevia) =>
    Math.abs(y.despues - y.antes) - Math.abs(x.despues - x.antes);

  return {
    activas: candidatas.length,
    antes,
    despues,
    entran: entran.sort(porSalto).slice(0, MAX_FILAS),
    salen: salen.sort(porSalto).slice(0, MAX_FILAS),
    totalEntran: entran.length,
    totalSalen: salen.length,
    salenRevisadas,
  };
}
