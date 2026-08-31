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
