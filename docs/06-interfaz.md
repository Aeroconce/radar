# 06 — Interfaz

Principio: tres pantallas resuelven todo el uso. Todo en español neutro, sin jerga técnica ("Revisar", "Guardar", "Adjuntar", "Descartar"). Diseño sobrio: una tipografía, dos tamaños, color solo para estados. Componentes de shadcn/ui: `Table`, `Input`, `Select`, `Badge`, `Dialog`, `Sheet`, `Textarea`, `Checkbox`, `Toast`, `DropdownMenu`.

## Navegación (barra lateral fija)
Tablero · Favoritas · Todas las vistas · Reglas · último barrido · perfil activo (cambiar, cerrar sesión).

Son tres y no más (D-27). Histórico, Configuración y Auditoría se descartaron: el equipo son tres personas que hablan entre sí, y una pantalla que nadie abre igual hay que mantenerla.

## 1. Tablero (`/`) — RF-04
- **Búsqueda** con foco automático al entrar: texto libre sobre código, nombre, organismo, unidad y descripción; sin distinción de tildes ni mayúsculas; resultados mientras se escribe (300 ms).
- **Filtros** en una fila plegable, todos combinables y reflejados en la URL para compartir enlaces:
  - Estado de revisión (varios): Nueva, En revisión, Viable, Descartada, Ofertada, Adjudicada, Perdida. Por defecto: Nueva, En revisión, Viable.
  - Vertical (varios). Tipo de comprador (varios). Tipo de proceso (varios). Región (varios).
  - Monto: mínimo y máximo. Cierre: desde y hasta. Afinidad mínima: campo numérico que admite negativos, porque las exclusiones restan (`docs/04`). Por defecto, el umbral vigente.
  - Interruptores: "Solo nuevas", "Cierra en 7 días", "Sin monto publicado", "Con señales de incumbente".
  - Botón "Limpiar filtros".
- **Tabla** ordenable por cierre (por defecto, ascendente), afinidad, monto, publicación. Columnas: Estado (badge), Código, Nombre (enlace a la ficha, dos líneas máximo), Organismo, Región, Tipo, Monto, Duración, Cierre (con "en N días" y color ámbar bajo 5 días, rojo bajo 2), Afinidad (número), Vertical (badge), Revisor y fecha de la última revisión.
- Paginación de 50 filas; contador "N licitaciones"; exportar a Excel con los filtros aplicados (RF-11).
- Acciones rápidas en cada fila (menú): "Marcar en revisión", "Descartar…" (abre el diálogo de revisión con motivos), "Abrir en Mercado Público" (`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=<código>`).
- Atajos: `/` enfoca la búsqueda; `j`/`k` mueven la selección; `Enter` abre la ficha; `d` descarta; `r` marca en revisión.

## 2. Ficha (`/licitaciones/[id]`) — RF-05, RF-06, RF-07
Dos columnas en escritorio, una en móvil.
- **Izquierda — Datos**: nombre, código, estado en el portal, organismo y unidad, región, tipo de proceso, monto y moneda, duración, contrato/toma de razón, fechas (publicación, fin de preguntas, respuestas, cierre, adjudicación estimada) con "en N días", descripción completa, ítems (producto, cantidad, descripción). Enlace al portal. Coincidencias que la seleccionaron y señales de incumbente como badges.
- **Izquierda — Historial del comprador y de la vertical**: adjudicaciones anteriores del mismo organismo (si hay) y las últimas 10 de la misma vertical con ganador, número de oferentes y monto; enlace al histórico filtrado. Es el contexto que antes había que buscar a mano.
- **Derecha — Revisión** (formulario, Server Action): estado (select), motivos (casillas del catálogo, `docs/07`), nota "Por qué sí / por qué no" (texto libre, mínimo 20 caracteres al pasar a Viable o Descartada), botón Guardar. Debajo, **Adjuntos**: lista con tipo, nombre, tamaño, quién y cuándo, descarga; zona para arrastrar archivos con selector de tipo (Bases, Anexo, Foro, Acta, Otro).
- **Abajo — Bitácora**: todas las revisiones en orden cronológico inverso: fecha, usuario, estado, motivos, nota.

## 2b. Favoritas (`/favoritas`)

Marcador **personal** de cada perfil, con la estrella de la primera columna del tablero. Se ordenan por
cierre y no por cuando se marcaron: lo que urge manda. El contador va junto al enlace de la barra lateral.

No reemplaza al estado: VIABLE dice que el equipo la sigue, la estrella dice que alguien quiere volver a
mirarla. Son cosas distintas y por eso conviven.

## 2c. Todas las vistas (`/vistas`) — D-32
Las ~4.700 activas que el radar vio en el último barrido, hayan entrado al tablero o no. Sin búsqueda no
lista nada: existe para una pregunta concreta («¿se le escapó algo a las reglas?»), no para hojear. Cada
resultado muestra afinidad y cierre; si ya está en el tablero enlaza la ficha, y si no, un botón la trae:
pide la ficha a la API, la crea con su puntaje real y anota en la bitácora quién la trajo. El tablero
enlaza aquí desde «¿No está lo que buscas?», arrastrando la búsqueda escrita.

## 3. Reglas (`/reglas`) — RF-09
De lo que más decide a lo que solo informa:

1. **Parámetros**: umbral de selección, umbral de aviso, monto máximo y tipos de proceso. Cada campo lleva escrito al lado qué hace; un campo llamado «umbral» sin más es una perilla a ciegas.
2. **Palabras clave**, **Exclusiones**, **Tipo de comprador** y **Señales de proveedor instalado**, cada tipo con su explicación. Cada regla se edita en su lugar, se activa o desactiva sin borrarla, y se elimina con confirmación en la misma fila.
3. **Aplicar al tablero**: vuelve a puntuar las licitaciones ya guardadas con las reglas de ahora, sin llamar a la API. Hace falta porque el barrido no las vuelve a mirar (`docs/05`): sin esto, editar una regla no se nota hasta que aparezca una licitación nueva. No borra ninguna; una que baja del umbral se queda con su puntaje nuevo.

Las flechas de orden solo aparecen donde la posición cambia el resultado: en las palabras clave desempata los pesos iguales y en los patrones de comprador gana el primero que coincide (`docs/04`).

**Vista previa.** Cada formulario trae «Probar», que calcula sobre las activas del último barrido —sin escribir y sin llamar a la API— cuántas se seleccionan hoy, cuántas con el cambio, y las listas de las que entrarían y dejarían de entrar. Si alguna de las que salen ya fue revisada por el equipo, se dice aparte: es el aviso de que el cambio afecta algo sobre lo que ya se decidió.

RF-09 reserva esta pantalla al Administrador. Con una sola cuenta compartida (D-22) ese rol no distingue a nadie; el control que queda es la bitácora, que anota cada cambio con el perfil que lo hizo.

## Estados y colores
Nueva (azul), En revisión (ámbar), Viable (verde), Descartada (gris), Ofertada (violeta), Adjudicada (verde oscuro), Perdida (rojo apagado). Los colores acompañan siempre al texto del estado.

## Estados vacíos y errores
"No hay licitaciones con estos filtros" con botón para limpiarlos; el estado del último barrido en la barra lateral, con «falló» en rojo cuando `JobRun` reciente terminó con error (RN-07); mensajes de validación junto al campo.

## Responsive
El tablero en móvil muestra tarjetas (nombre, organismo, cierre, estado, afinidad) con la misma búsqueda y filtros en un panel lateral (`Sheet`).
