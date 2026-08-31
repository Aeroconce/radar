# 06 — Interfaz

Principio: tres pantallas resuelven el 95 % del uso. Todo en español neutro, sin jerga técnica ("Revisar", "Guardar", "Adjuntar", "Descartar"). Diseño sobrio: una tipografía, dos tamaños, color solo para estados. Componentes de shadcn/ui: `Table`, `Input`, `Select`, `Badge`, `Dialog`, `Sheet`, `Textarea`, `Checkbox`, `Toast`, `DropdownMenu`.

## Navegación (barra superior)
Tablero · Histórico · Reglas (solo Administrador) · Configuración (solo Administrador) · Auditoría (solo Administrador) · menú de usuario (nombre, cerrar sesión).

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

## 3. Histórico (`/historico`) — RF-08
Dos pestañas:
- **Adjudicaciones**: búsqueda y filtros por vertical, comprador, proveedor, fechas; tabla con fecha, código, comprador, nombre, duración, oferentes, ganador, monto estimado, monto adjudicado; fila expandible con todos los oferentes y sus montos (marcando los unitarios). Exportar a Excel.
- **Proveedores**: por vertical, ofertas, ganadas, tasa de éxito, monto mediano; clic en un proveedor lista sus ofertas.

## 4. Reglas (`/reglas`) — RF-09, Administrador
Tabla editable por tipo (palabras clave por vertical, exclusiones, patrones de comprador, señales de incumbente) con peso y activo/inactivo; parámetros (umbral, umbral alto para avisos, monto máximo, tipos de proceso); botón "Probar con las activas de hoy" y confirmación al guardar. Cada cambio queda en auditoría.

## 5. Configuración (`/configuracion`) — Administrador
Usuarios (crear, rol, activar/desactivar, restablecer contraseña), notificaciones (destinatarios de correo, hora del resumen, activar/desactivar cada tipo), estado del worker (últimas ejecuciones con conteos y errores, botón "Ejecutar barrido ahora").

## 6. Auditoría (`/auditoria`) — RF-13
Tabla con filtros por usuario, acción y fechas; exportación.

## Estados y colores
Nueva (azul), En revisión (ámbar), Viable (verde), Descartada (gris), Ofertada (violeta), Adjudicada (verde oscuro), Perdida (rojo apagado). Los colores acompañan siempre al texto del estado.

## Estados vacíos y errores
"No hay licitaciones con estos filtros" con botón para limpiarlos; "El último barrido falló: ver Configuración" cuando `JobRun` reciente terminó con error; mensajes de validación junto al campo.

## Responsive
El tablero en móvil muestra tarjetas (nombre, organismo, cierre, estado, afinidad) con la misma búsqueda y filtros en un panel lateral (`Sheet`).
