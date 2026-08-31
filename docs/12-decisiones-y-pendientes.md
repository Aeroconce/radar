# 12 — Decisiones y pendientes

## Decisiones
- **D-01** Radar, no oráculo: el sistema selecciona y ordena; no calcula probabilidades ni veredictos. Las personas leen las bases y dejan la nota.
- **D-02** Sin modelos de lenguaje. Reglas editables desde la interfaz.
- **D-03** Next.js **16.3.3** con App Router y TypeScript; identificadores en inglés, interfaz en español neutro. (Se escribió "15" cuando se planeó; el andamiaje instaló 16.)
- **D-04** Worker separado con node-cron (no dentro de Next), mismo repositorio, dos procesos. ~~PM2~~ → systemd, ver D-13.
- **D-05** pnpm en todo el proyecto.
- **D-06** Ritmo de la API: 3,5 s entre llamadas; reintentos ante 10500. La cuota diaria no es un problema.
- **D-07** Las bases se adjuntan a mano: la API pública no entrega adjuntos.
- **D-08** Estados y catálogo de motivos fijos (`docs/07`); la nota libre lleva el detalle.
- **D-09** La respuesta íntegra de la API se guarda en `Tender.raw`.
- **D-10** ~~ntfy como canal inicial; WhatsApp después.~~ Reemplazada por D-12 el 2026-08-30.
- **D-11** Dominio `radar.aeroconce.cl`, aprovisionado el 2026-08-30 en el VPS de Aeroconce (usuario `radar`, puerto 3050, base `radar`, TLS Let's Encrypt). Resuelve T-01.
- **D-13** **systemd, no PM2**, como gestor de los dos procesos (`radar`, `radar-worker`). Es lo que quedó aprovisionado y funcionando, y sigue el patrón del proyecto más reciente del VPS. Resuelve T-06 y corrige D-04.
- **D-14** **nginx, no Caddy**, para TLS y proxy inverso. No fue una elección: el servidor no tiene Caddy y los ocho sitios existentes corren sobre nginx. La guía decía Caddy por error.
- **D-15** **`LS` se representa pero no se selecciona.** El enum `ProcessType` lo incluye porque la API puede devolverlo, pero el motor no lo toma por defecto (servicios personales especializados, fuera del perfil). Representar no es seleccionar.
- **D-16** **Los avisos se registran antes de enviarse.** `Notification` nace `PENDING` y pasa a `SENT` con el `providerId` de Resend o a `FAILED` con el error, para que un fallo quede registrado y sea reintentable, como exige `docs/08`.
- **D-20** **Node 22 aislado para el usuario `radar`**, en `/home/radar/.local/node`, en vez de subir el del sistema. pnpm 11 exige `node:sqlite`, que existe desde Node 22, pero el VPS es compartido y cuatro servicios de otros proyectos corren sobre el Node 20 del sistema. Resuelve T-07 sin arriesgar a los demas.
- **D-21** **El codigo viaja por un repositorio bare en el propio VPS** (`/home/radar/radar.git`), no por un servicio de terceros. El hook de recepcion solo deja los archivos: no instala, no compila y no reinicia, porque un push a medio terminar no debe poder tumbar produccion. El despliegue es deliberado (docs/10).
- **D-19** **Los avisos se despachan al cerrar el barrido, no al encolarlos.** Si el ciclo falla a mitad, no sale un correo anunciando algo que no se guardo. Tras cuatro intentos fallidos se deja de reintentar y el aviso queda `FAILED` con su error, visible en Configuracion. `RESEND_REPLY_TO` resuelve T-09: el dominio del radar no recibe correo, asi que las respuestas necesitan una casilla real.
- **D-18** **El alcance es desarrollo y arriendo de sistemas.** Solo entra lo que se entrega como software. Las verticales describen de qué trata el sistema, no reemplazan la exigencia de que sea un sistema. En consecuencia se acotó la regla genérica de peso 3 (salieron `encuesta`, `oirs`, `tramites`, `automatizacion`, `transparencia`; `integracion` pide contexto de sistemas) y **ciberseguridad y ethical hacking quedan fuera**, lo que resuelve T-13. La seleccion sobre el barrido del 27-08-2026 baja de 35 a 25 de 40: salen seis encuestas, un portón, un ascensor, una oficina OIRS y una mejora de dependencias. Los 13 casos obligatorios de `docs/04` siguen cumpliéndose y la contactabilidad, que es 21 de las 45 adjudicaciones del histórico, no se tocó.
- **D-17** **PostgreSQL 16 en Docker para desarrollo local**, definido en `docker-compose.yml`. Escucha en `127.0.0.1:5435` porque los puertos 5432, 5433 y 5434 ya estaban ocupados en la máquina (entre ellos un PostgreSQL 16 de Windows de otro proyecto). La imagen entrega 16.15, la misma versión exacta del VPS, con la misma configuración regional `C.UTF-8` para que `ORDER BY` sobre texto ordene igual. Resuelve T-08.
- **D-12** **Correo vía Resend como canal único de notificaciones.** Sin ntfy y sin WhatsApp. Dominio `radar.aeroconce.cl` verificado en Resend el 2026-08-30 (región `sa-east-1`, envío habilitado, recepción deshabilitada). Reemplaza D-10.

## Pendientes de decisión
- **T-02** Contraseña inicial del administrador y lista de destinatarios (`NOTIFY_TO`).
- **T-03** Umbral inicial (3) y umbral de aviso (8): ajustar con la primera semana de uso.
- **T-04** Si el histórico debe recorrer también 2023 (más llamadas; más referencias de precios).
- **T-05** Perfil de vehículos (Aeroconce / persona natural) como etiqueta en la revisión, para filtrar por vehículo posible.
- **T-14** Completar los ocho códigos de reventa de licencias de `seed/revisiones.json`: vienen sin el sufijo
  de tipo y año (`4447-14` en vez de `4447-14-LE26`), así que no se pueden buscar en la API. Igual con los
  siete organismos de baja prioridad, que no tienen código: Macul, Bulnes, MNBA CEDOC, CRS Peñalolén,
  SS Aconcagua, CRS Cordillera y SMAPA.
- **T-15** Confirmar el estado de `1421874-14-LE26` (Lo Prado, mantención web más plataforma de eventos).
  Venía listada entre las ofertadas pero la nota dice «analizada, con preguntas al foro»: se cargó como
  **en revisión**, no como ofertada.
- **T-16** Evaluar un motivo de descarte propio para «fuera de rubro». De las 30 descartadas, **8 quedaron en
  `OTRO`**, casi todas por no ser software o por descarte en triaje. Un código específico haría el análisis de
  falsos positivos más útil que un cajón de sastre.
- **T-11** Interpretación del campo `Contrato` de la API. En los datos toma 0, 1 y 2, y no está documentado. El parser asume 1 = exige contrato, 2 = no exige, 0 = sin informar; el valor crudo queda en `Tender.raw`. Confirmar.
- **T-10** Rotar la clave de Resend antes de producción: la actual se compartió por chat durante el desarrollo y da permiso de envío sobre el dominio verificado.

## Registro de novedades
(Anotar aquí ideas fuera de alcance, errores conocidos aceptados y desvíos del plan, con fecha y motivo.)

- **2026-08-30** El stack real quedó por delante de la guía: **Next.js 16.3.3** (no 15) y **Prisma 7.10** (no 6), porque es lo que instaló el andamiaje. D-03 sigue vigente en lo esencial (App Router + TypeScript). Next 16 eliminó `next lint`; el script `lint` usa `eslint` directo.
- **2026-08-30** En el VPS no hay **Caddy**: los ocho sitios existentes corren sobre **nginx**. La guía decía Caddy por error. `docs/10` debe revisarse con esto.
- **2026-08-30** `prisma@latest` en npm apunta a un release candidate de la 8 mientras `@prisma/client@latest` es 7.10.0 estable. Ambos quedaron **pineados a 7.10.0**; no actualizar sin verificar `npm view prisma dist-tags`.
- **2026-08-31** **Worker desplegado y corriendo en el VPS.** Barrido agendado cada dos horas en el minuto 15, hora de Chile. La base de produccion quedo con 50 licitaciones, 36 revisiones, 45 adjudicaciones historicas y las 20 reglas.
  Tres cosas que aparecieron al desplegar. **(a)** El problema de pnpm no era corepack: **pnpm 11 exige `node:sqlite`, que solo existe desde Node 22**, y corepack lo disfrazaba de un error de import dinamico. Se instalo Node 22 solo para el usuario `radar` (D-20). **(b)** `referencia/fetch.py` y `hist.py` **tenian el ticket de Mercado Publico hardcodeado**; commitearlos lo habria dejado en el historial de git para siempre, contra lo que dice `docs/09`. Ahora lo leen del entorno. **(c)** El `.env` del servidor, creado desde Windows en el aprovisionamiento, tenia **10 retornos de carro**. systemd los normaliza, asi que no se manifesto, pero un `` al final del ticket habria roto las llamadas a la API sin decir por que. Archivo normalizado a LF.
- **2026-08-31** Cargadas las **36 revisiones** que el equipo ya había hecho (`seed/revisiones.json`), lo que
  cierra T-12. El tablero queda con 30 descartadas, 2 ofertadas, 2 viables, 1 en revisión y 1 perdida, y esas
  **no volverán a aparecer como nuevas**: el barrido preserva `reviewStatus` al actualizar una ficha, así que
  basta marcarlas una vez. La semilla pidió a la API las 21 fichas que no estaban en la base.
  El motivo de descarte más frecuente es `PRODUCTO_NICHO` (10 de 30): ERP municipal, farmacia y payroll.
  Las exclusiones de `docs/04` ya cubren ERP y remuneraciones, pero **no farmacia**; vale revisarlo.
- **2026-08-31** Rediseño del correo. El primero mostraba nombre, organismo, cierre, monto y un «Afinidad 16»
  sin escala: no decía de que se trataba la licitacion ni por que la habia seleccionado. Ahora el asunto abre
  con el plazo, el cuerpo trae un extracto de la descripcion real de las bases, la afinidad va contra su
  umbral, se muestran los terminos que coincidieron y se advierten las senales de proveedor instalado.
  Enlace tambien al portal, porque las bases se descargan de ahi.
- **2026-08-31** Envio de correo (`src/lib/notifications/`). Verificado de punta a punta: el barrido encolo tres avisos `NEW_HIGH_AFFINITY` sobre licitaciones reales de hoy, el despachador los envio y Resend los reporta **entregados**; el segundo despacho envio cero. Una de las tres es «SISTEMA INFORMATICO WEB PARA CENTROS DE SALUD», que es uno de los casos obligatorios de `docs/04`, encontrada en vivo por el radar.
  Las pruebas se hicieron hermeticas con `tests/setup.ts`: `env.ts` valida al importarse, asi que sin eso no se podia probar nada que dependiera de el ni correr la suite en CI.
- **2026-08-31** Cliente de la API y barrido (`src/lib/mp/client.ts`, `worker/`). Primer barrido completo
  contra la API real: **4.718 activas revisadas en 11 min 19 s, 177 llamadas, cero reintentos y cero fallos**;
  38 seleccionadas, 15 nuevas al tablero y 3 avisos encolados. El ritmo de 3,5 s evito todos los 10500. Tres cosas que aparecieron al construirlo.
  **(a)** El cliente usaba `0` como centinela de «ninguna llamada aun», que choca con una marca de tiempo
  legitima de 0; con un reloj inyectado el ritmo de 3,5 s no se aplicaba. Ahora es `null`.
  **(b)** El barrido pedia la ficha de toda activa cerca del umbral, incluidas las que ya estaban en
  `Tender`: **198 llamadas y ~12 minutos por ciclo**. `docs/05` dice «para cada codigo no existente en
  `Tender`»; corregido, y ahora tambien refresca la ficha cuando el cierre cambia, que es una prorroga.
  **(c)** `docs/03` decia «5, 8, 11 y 14 s antes de cada reintento (4 intentos)»: cuatro esperas pero
  cuatro intentos dejaria la de 14 s sin usar. Se resolvio como cuatro reintentos, cinco llamadas.
  Los cron llevan `timezone: 'America/Santiago'` explicito, que resuelve el pendiente de zona horaria.
- **2026-08-30** Alcance acotado a desarrollo y arriendo de sistemas (D-18). Al aplicarlo aparecieron dos
  cosas más. **(a)** La exclusión `curso` no tenía límite de palabra y matcheaba dentro de «recursos»,
  restando 6 puntos en 5 de las 87 fichas; entre ellas `3134-72-LR26`, «CONTRATAR EL DESARROLLO DE UN SISTEMA
  INFORMÁTICO», que es exactamente el perfil buscado y quedaba fuera del tablero. Corregido con `\\b`, igual
  que `ups`, que matchearía en «backups». **(b)** La semilla evaluaba de una vez sobre nombre + descripción,
  saltandose las dos etapas del barrido: la ficha solo se pide cuando el nombre queda a un punto del umbral
  (`docs/04`). Eso hacía entrar licitaciones que el worker nunca habría mirado. Ahora la semilla reproduce
  ambas etapas. Resultado sobre el barrido del 27-08-2026: **24 seleccionadas de 40**, y las 16 descartadas
  quedan en `SeenTender` para revisar falsos negativos.
- **2026-08-30** Motor de afinidad en TypeScript (`src/lib/affinity/`). Las reglas iniciales se extrajeron a
  `initial-rules.ts` para que la semilla y las pruebas usen la misma definición; el motor solo sabe aplicarlas,
  porque RF-09 las hace editables desde la interfaz. 47 pruebas, incluidos los 13 casos obligatorios de
  `docs/04` y la comparación contra la base del motor Python: reproduce 35 de las 40 candidatas, una es la
  exclusión deliberada del ERP municipal que `docs/04` exige y cuatro dependen de reglas no documentadas
  (T-13). La normalización conserva las posiciones del texto, así que las coincidencias se reportan con sus
  tildes tal como las escribió el comprador. La semilla ya clasifica vertical, tipo de comprador y señales
  de incumbente con este mismo motor.
- **2026-08-30** Revision de codigo sobre la semilla y el parser. Cuatro correcciones: **(a)** `seedAdmin` creaba el usuario con el id literal `seed-admin`, asi que cambiar `SEED_ADMIN_EMAIL` abortaba la carga con violacion de clave primaria (comprobado contra la base); ahora usa `randomUUID()`. **(b)** `parseDurationLabel` asignaba «meses» a cualquier duracion sin letra de unidad, e invento «30 meses» para `568963-25-LE25`, cuyo origen dice solo `30 `; ahora devuelve nulo salvo que la unidad venga explicita. **(c)** `??` no atrapa el 0, asi que un monto 0 en el acta tapaba el valor de respaldo; se reemplazo por un ayudante que toma el primer monto positivo. **(d)** `HistoricalAward.raw` podia guardar la ficha de la API o el resumen del seed, dos formas incompatibles para una columna que `docs/02` promete reprocesable; ahora solo guarda la ficha. Ademas el `upsert` del historico pasa a actualizar los campos, para que una correccion en `seed/` se propague al resembrar en vez de quedar congelada.
- **2026-08-30** Semilla escrita y verificada contra la base: 40 licitaciones, 45 adjudicaciones con 130 ofertas, 20 reglas, 6 parámetros. Idempotente (dos corridas, mismos conteos). El mapeo ficha→`Tender` vive en `src/lib/mp/parsers.ts`, no en la semilla, para que el worker y la carga inicial no tengan dos versiones. Se comprobó ficha por ficha que las 39 fechas de cierre pasan de hora de Chile a UTC correctamente, incluido el cruce del horario de verano del 6 de septiembre (+4h antes, +3h después). Se agregó `AffinityRule.buyerType`: las reglas `BUYER_PATTERN` no tenían dónde declarar su destino, y RF-09 las exige editables.
- **2026-08-30** Primera migración aplicada (`20260830234706_init`): 12 tablas y 9 enums. Se verificó contra la base real que `Notification_dedupeKey_key` rechaza un segundo `DAILY_DIGEST` del mismo día, y que el diseño original (`UNIQUE(type, tenderId)` con `tenderId` nulo) aceptaba tres filas idénticas. El bug de RN-02 era real.
- **2026-08-30** Segunda pasada: se alinearon los 13 documentos con lo construido y con las decisiones D-13 a D-16. `docs/02` dejó de transcribir el schema y ahora explica invariantes y decisiones apuntando a `prisma/schema.prisma`, que es la única definición; tenían dos copias divergentes. `docs/10` se reescribió entero contra nginx + systemd + `/home/radar/app`. Al schema se le agregaron `JobType.CLEANUP` (la tarea existía en `docs/05` sin valor en el enum), `Tender.outOfScale`, `Attachment.checksum` y los campos de estado de `Notification`; se eliminó `JobType.DETAIL`, que no usaba nadie. Los tres interruptores del tablero que no tenían identificador entraron a RF-04.
- **2026-08-30** Revisión cruzada de los 13 documentos antes de empezar a construir. Dos correcciones al modelo:
  **(a)** El `@@unique([type, tenderId])` de `Notification` no servía como idempotencia: `tenderId` es nulo en `DAILY_DIGEST` y PostgreSQL trata cada NULL como distinto, así que rompía RN-02. Reemplazado por `dedupeKey String @unique`.
  **(b)** El barrido sólo persistía las licitaciones seleccionadas, dejando sin respaldo la vista previa de reglas (`docs/04`) y la detección de falsos negativos (flujo paso 5), que son objetivos declarados. Se agregó `SeenTender`.
  El `prisma/schema.prisma` real se escribió con ambos arreglos; aún sin migración aplicada (falta base, T-08).
- **2026-08-30** La documentación se desempacó de `radar-docs/` a la raíz (`docs/`, `seed/`, `referencia/`, `.env.example`) y la guía maestra se fusionó en `AGENTS.md`, porque Next sobrescribe `CLAUDE.md` por completo en cada `next dev`.
