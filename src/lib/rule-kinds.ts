/**
 * Como se presentan los cuatro tipos de regla (RF-09, docs/04).
 *
 * Cada uno hace algo distinto y se equivoca distinto, asi que la pantalla los
 * separa en vez de mostrar una tabla de veinte filas con una columna "tipo".
 *
 * `orden` marca los tipos donde la posicion cambia el resultado: en los de
 * comprador gana el primer patron que coincide, y en las palabras clave el orden
 * desempata los pesos iguales. En exclusiones y senales da lo mismo, y ofrecer
 * flechas ahi sugeriria una precedencia que no existe.
 */
export interface TipoRegla {
  titulo: string;
  /** Que hace este tipo, en una frase. */
  descripcion: string;
  /** Tiene peso editable. */
  peso: boolean;
  /** Asigna vertical (KEYWORD) o tipo de comprador (BUYER_PATTERN). */
  destino: "vertical" | "buyerType" | null;
  /** La posicion cambia el resultado. */
  orden: boolean;
  /** Texto del boton para agregar. */
  agregar: string;
}

export const TIPOS_REGLA: Record<string, TipoRegla> = {
  KEYWORD: {
    titulo: "Palabras clave",
    descripcion:
      "Suman puntaje y asignan la vertical. Gana la de mayor peso que coincida; entre pesos iguales, la primera.",
    peso: true,
    destino: "vertical",
    orden: true,
    agregar: "Agregar palabra clave",
  },
  EXCLUSION: {
    titulo: "Exclusiones",
    descripcion:
      "Restan puntaje. Sacan del radar lo que no se entrega como software: equipos, licencias de terceros, cursos, insumos.",
    peso: true,
    destino: null,
    orden: false,
    agregar: "Agregar exclusión",
  },
  BUYER_PATTERN: {
    titulo: "Tipo de comprador",
    descripcion:
      "Clasifican al organismo. Gana el primer patrón que coincide: un hospital dependiente de un municipio sigue siendo un hospital, y por eso va antes.",
    peso: false,
    destino: "buyerType",
    orden: true,
    agregar: "Agregar patrón de comprador",
  },
  INCUMBENT_SIGNAL: {
    titulo: "Señales de proveedor instalado",
    descripcion:
      "No restan puntaje. Marcan la ficha para que quien revise sepa que puede estar leyendo unas bases escritas alrededor de otro proveedor.",
    peso: false,
    destino: null,
    orden: false,
    agregar: "Agregar señal",
  },
};

/** De lo que mas decide a lo que solo informa. */
export const ORDEN_TIPOS = ["KEYWORD", "EXCLUSION", "BUYER_PATTERN", "INCUMBENT_SIGNAL"];

/**
 * Corta un patron en los terminos que busca.
 *
 * Una regla es una expresion regular, y escrita de corrido —cuarenta palabras
 * separadas por barras, sin tildes y con algunas cortadas a proposito— se lee
 * como un texto mal escrito. Separada en terminos se lee como lo que es: una
 * lista de cosas que el radar busca.
 *
 * No reescribe nada: cada termino sale tal cual esta en la expresion. Un patron
 * "embellecido" que no dijera exactamente lo que el motor evalua seria peor que
 * el crudo.
 *
 * Solo corta por las barras de primer nivel. Las de adentro de un parentesis
 * —`(citas|horas)`— son parte de un termino, no otro termino.
 */
export function terminosDe(patron: string): string[] {
  const partes: string[] = [];
  let actual = "";
  let profundidad = 0;
  let enClase = false;

  for (let i = 0; i < patron.length; i++) {
    const c = patron[i];

    // Lo escapado va entero: una barra escapada no separa nada.
    if (c === "\\") {
      actual += c + (patron[i + 1] ?? "");
      i++;
      continue;
    }
    if (enClase) {
      actual += c;
      if (c === "]") enClase = false;
      continue;
    }
    if (c === "[") {
      enClase = true;
      actual += c;
      continue;
    }
    if (c === "(") profundidad++;
    if (c === ")") profundidad--;
    if (c === "|" && profundidad === 0) {
      partes.push(actual);
      actual = "";
      continue;
    }
    actual += c;
  }
  partes.push(actual);

  /*
   * Sin recortar los espacios: en `crs ` el espacio final es parte de la regla
   * —impide que coincida dentro de otra palabra— y quitarlo para mostrarla
   * dejaria en pantalla una regla distinta de la que el motor evalua.
   */
  return partes.filter((p) => p.length > 0);
}

/** Separa un termino en sus espacios de los bordes y lo del medio. */
export function bordesDe(termino: string): { inicio: string; nucleo: string; fin: string } {
  const inicio = /^\s+/.exec(termino)?.[0] ?? "";
  const resto = termino.slice(inicio.length);
  const fin = /\s+$/.exec(resto)?.[0] ?? "";
  return { inicio, nucleo: resto.slice(0, resto.length - fin.length), fin };
}

/**
 * Separa un termino en lo que se lee y lo que es sintaxis.
 *
 * Sirve para atenuar los parentesis, las barras y los corchetes, y que la
 * palabra se lea primero. `esTexto` marca los trozos legibles.
 */
export function trozosDe(termino: string): Array<{ texto: string; esTexto: boolean }> {
  const trozos: Array<{ texto: string; esTexto: boolean }> = [];
  for (const m of termino.matchAll(/[\p{L}\p{N} -]+|[^\p{L}\p{N} -]+/gu)) {
    trozos.push({ texto: m[0], esTexto: /[\p{L}\p{N}]/u.test(m[0]) });
  }
  return trozos;
}
