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

/** Une una lista en espanol: "a, b o c". */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} o ${partes[partes.length - 1]}`;
}

/**
 * Un termino escrito como frase, sin signos.
 *
 * La expresion es exacta pero no se lee: `desarrollo (de )?(sistema|software)`
 * no es texto, es notacion. Esto la pasa a palabras —"desarrollo de sistema o
 * software"— que es lo que alguien necesita para decidir si la regla busca lo
 * que tiene que buscar.
 *
 * Es un resumen, no la regla. Pierde matices a proposito: que el "de" sea
 * opcional, o que un espacio al borde sea obligatorio, no cambia lo que la
 * regla persigue y sí estorba al leerla. La expresion exacta esta en «Editar»,
 * y es la que el motor evalua.
 */
export function comoFrase(termino: string): string {
  let t = termino;

  // Una letra entre corchetes multiplica la palabra: informatic[oa] son dos.
  t = t.replace(/(\p{L}+)\[(\p{L}+)\]/gu, (_, raiz: string, letras: string) =>
    enumerar([...letras].map((l) => raiz + l)),
  );

  /*
   * Grupo, sea opcional o no: pasa a lista.
   *
   * El interrogante final se toma junto con el parentesis. Tratarlos por
   * separado dejaba las barras de un grupo opcional con alternativas —como
   * `(de |con )?`— sin convertir, y salian a pantalla.
   *
   * Lo opcional se deja escrito: "desarrollo de sistema" se lee mejor que
   * "desarrollo sistema", y la regla acepta las dos formas igual.
   */
  t = t.replace(/\(([^()]*)\)\??/g, (_, dentro: string) => enumerar(dentro.split("|")));

  // "cualquier cosa en el medio", que es lo que dice `.*`.
  t = t.replace(/\.\*/g, " y luego ");

  t = t.replace(/\\b/g, ""); // limite de palabra: no se ve ni se lee
  t = t.replace(/\\(.)/g, "$1"); // lo escapado vale por si mismo: \. es un punto
  t = t.replace(/(.)\?/g, "$1"); // lo opcional se deja: activos? es "activos"

  return t.replace(/\s+/g, " ").trim();
}

/** Las frases de una regla, listas para mostrar. */
export function frasesDe(patron: string): string[] {
  return terminosDe(patron)
    .map(comoFrase)
    .filter((f) => f.length > 0);
}
