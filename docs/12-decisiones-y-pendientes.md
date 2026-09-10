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
- **D-47** **«Mantenimiento preventivo» es tema, no sistema** (11-09-2026). Salió al aplicar D-45: con la resta por
  falta de ítem de software en 6, Arica (1075963-403-L126) seguía en 4 —12 de texto, −6, −2— sobre el umbral y
  clasificada como CMMS. Sus 12 venían de `mantenimiento (preventivo|correctivo)` a peso 6, y cualquier contrato de
  aparatos lo incluye de paso. Misma lección de D-29, D-35 y D-43: pasa a 2 junto a los otros temas. Los dos CMMS
  reales de septiembre no se tocan (Ancud entra por «gestión de mantenimiento», el Sótero del Río por «componentes
  vinculados a mantenimiento»); Arica queda en 0. Es la única decisión de hoy que no venía en la lista: sin ella,
  la expectativa «Arica no entra» era inalcanzable con el umbral en 3.
- **D-46** **El tablero oculta por defecto también lo que quedó bajo el umbral tras recalcular** (11-09-2026,
  extiende D-42). Carabineros (3970-8-LE26, afinidad 2), FOSIS (762-7-LP26, 1) y Hospital del Salvador (1) seguían
  a la vista porque entraron con reglas viejas y «recalcular no borra»; D-42 solo ocultaba las negativas. El filtro
  pasa de `afinidad < 0` a `afinidad < umbral vigente` (`Setting.affinityThreshold`, que ahora reciben el tablero,
  los conteos y la exportación), con la misma casilla para verlas («Mostrar bajo el umbral»). Sigue sin tocar el
  estado ni el umbral: la precisión se gana con exclusiones y señales, no cerrando la puerta.
- **D-45** **Sin ítem de software vale una exclusión, e «integral» en el nombre resta** (11-09-2026). «ARRIENDO
  SISTEMA MONITOREO EN LINEA PARA REFRIGERADORES DE FARMACOS ONCOLOGICOS» (1075963-403-L126) sumó 12 por texto y
  quedó en 6 pese a «sin item de software» (−4) e «item de bienes» (−2): sensores de temperatura pasaron el umbral.
  `noSoftwareItemPenalty` pasa de 4 a 6, el peso de una exclusión: si el comprador no clasificó ningún ítem como
  software, no lo es. Y una señal nueva: `integral` en el **nombre** resta 2 y etiqueta —Subtrans pasó con 7 con
  «SERVICIO TECNOLÓGICO INTEGRAL» en el nombre—; solo sobre el nombre, porque Alto Hospicio dice «solución integral»
  en la descripción y es viable.
- **D-44** **Dos exclusiones por naturaleza que faltaban en D-36** (11-09-2026). Puerto Montt
  (1057539-138-LP26) es suministro de personal con otra redacción («servicios profesionales personal apoyo
  informática»: seis ingenieros por horas); FONASA «PLATAFORMA DE OBSERVABILIDAD AVANZADA MULTICLOUD»
  (591-26-LP26), Subtrans «SERVICIO TECNOLÓGICO INTEGRAL RED REGIONAL» (577290-2-LP26) y FOSIS «Administracion
  infraestructura tecnológica» (762-7-LP26) son infraestructura y monitoreo, la familia que D-18 dejó fuera del
  alcance igual que la ciberseguridad. Dos líneas nuevas de peso −6.
- **D-43** **APPOINTMENTS es tema, no sistema** (11-09-2026, primer día de barrido con las reglas de septiembre).
  «GESTION DOCUMENTAL Y DIGITAL MUNICIPALIDAD TILTIL» (3666-12-LE26) y «SERVICIOS PROFESIONALES PERSONAL APOYO
  INFORMATICA» (1057539-138-LP26) quedaron clasificadas como citas porque `recordatorio|whatsapp|chatbot|inasistencia`
  pesaban 6 y DOCUMENT_MGMT, con 5, perdía el empate. Misma lección de D-29 y D-35: la regla se divide, con 6 solo
  lo que nombra el sistema de citas (`agendamiento`, `confirmacion de citas`, `recordatorio de citas`,
  `contactabilidad`) y el resto pesa 2 junto a los otros temas; y DOCUMENT_MGMT sube a 6 **y pasa delante de APPOINTMENTS**:
  Tiltil también nombra un módulo de agendamiento, con 6 y 6 empataban y gana la primera. Un gestor documental con
  agenda es gestor documental.
- **D-42** **Las de afinidad negativa se ocultan del tablero por defecto.** Decisión del usuario el 11-09-2026, tras
  ver que recalcular con las señales de la ficha dejó 45 licitaciones bajo el umbral a la vista. Un puntaje bajo cero
  significa que alguna exclusión pesó más que todas las palabras juntas: no es del rubro, y verla cada día es ruido.
  Se **ocultan, no se descartan**: el estado de revisión sigue siendo del equipo (D-01, y «recalcular no borra» en
  `docs/04`). La casilla «Mostrar afinidad negativa» las trae de vuelta; los conteos de estado y la exportación
  (RF-11) siguen la misma regla, porque los tres leen el mismo filtro (`tablero-filtros.ts`). Las que quedan entre 0
  y el umbral siguen a la vista: están cerca y merecen una mirada.
- **D-41** **La ficha puntúa, no solo el texto.** En la muestra de septiembre de 2026 el canon mensual implícito
  (entre $0,8M y $3,5M en 5 de 5 viables y en 1 de 14 trampas), el tipo LR, la «adquisición» sin duración y la
  categoría de los ítems separaron viables de trampas mejor que cualquier palabra. Se calculan con la ficha en
  `src/lib/affinity/structural.ts` y se guardan aparte (`textScore`, `structuralScore`, `structuralTags`);
  `affinityScore` es la suma. La banda y las restas viven en `Setting` y se editan en la pantalla de reglas. La
  vista previa de reglas sigue mostrando solo texto a propósito. Con esto UFRO y Bulnes bajan a 9, doce trampas
  quedan bajo el umbral y las viables suben a 14–18 (`docs/13`, `docs/15`). Migración
  `20260911000000_senales_estructurales`. `semanas` se agregó a la conversión a meses porque la API la devuelve
  (código 3) y docs/15 no la contemplaba.
- **D-40** **Señales de oportunidad, espejo de las de incumbente.** Un relanzamiento (el primer llamado quedó
  desierto: Alto Hospicio y Coyhaique en septiembre de 2026) y la reserva para empresas de menor tamaño (art. 182 del
  reglamento) cambian la competencia. Tipo de regla `OPPORTUNITY_SIGNAL`, etiqueta positiva sin peso, guardada en
  `Tender.opportunitySignals` y mostrada junto a la de proveedor instalado. Las señales estructurales (`docs/15`) sí
  la consideran al puntuar.
- **D-39** **Las señales de incumbente conocen nombres propios.** CAS Chile, Rayen, GeoVictoria, Zecovery, Ceropapel,
  E-Delphyn, Softland, SMC y las frases de bases escritas alrededor de un sistema en producción («en caso de seguir con
  el mismo proveedor», «no podrá disminuir las capacidades»). Ver el nombre del competidor en la ficha vale más que
  una señal genérica.
- **D-38** **Las abreviaturas del listado puntúan.** El listado corta el nombre a 50 caracteres y los compradores
  abrevian: «SERV. PLAT. INFORMÁTICA DE REG. CONTROL Y SEGUI.» —la ofertada del Sótero del Río— puntuaba 2 y entraba
  solo por la puerta de ficha en umbral−1. Regla WEB_DEVELOPMENT de peso 5 para `plat.`, `sist.`, `serv.` y `sw`.
  Al aplicarla se acotó con límite de palabra tras `serv` (`plat\\b|sist\\b`): sin él, «SERV DE PLATAFORMA SIEM»
  volvía a entrar pese a la exclusión de ciberseguridad, y lo detectó `tests/baseline.test.ts`.
- **D-37** **Tres verticales nuevas: MAINTENANCE, ATTENDANCE y PHARMA_LOGISTICS.** Cuatro de las seis licitaciones
  reales de septiembre (Alto Hospicio, San Bernardo, Ancud y la ofertada del Sótero del Río) caían en
  WEB_DEVELOPMENT porque su vertical no existía. La vertical es el eje del tablero: sin estas no se puede filtrar
  «mantenimiento» y ver los dos CMMS. Van antes de WEB_DEVELOPMENT con peso 6. Migración
  `20260910230000_verticales_y_senales_de_oportunidad`.
- **D-36** **Se excluye por naturaleza del contrato, no solo por objeto físico.** Nueve de los catorce descartes de
  septiembre eran de cinco naturalezas sin ninguna exclusión: sistemas clínicos (RCE, LIS, HIS), suministro de
  personal, publicidad, seguros y plataforma integral; y «software de diseño CAD» pasaba porque la regla de licencias
  exigía la palabra «licencias» más una marca. Seis líneas nuevas de peso −6, cada una acotada con contexto para no
  botar un módulo de difusión dentro de un sistema ni un «sistema de turnos» de control de asistencia. Efecto sobre la
  base del 27-08-2026: sale el RCE de Aconcagua (2200-23-LR26), declarado en `tests/baseline.test.ts`.
- **D-35** **«Activo fijo» es tema, no sistema, como «inventario» (D-29).** `activos? fijos?` con peso 6 traía solo
  al tablero un seguro contra incendio «para bienes de uso de activo fijo», una implementación deportiva «y activos
  fijos no financieros» y el ITAM de JUNAEB por «gestión de activos TI». Con 6 solo pegado a una palabra de sistema
  (`software de activos fijos`, `activo fijo institucional`); solo, pesa 2 y entra acompañado.
- **Numeración de los documentos de septiembre.** Los documentos de trabajo del plan de precisión llegaron numerados
  D-32 a D-38 y como `10-` a `16-`, continuando una numeración que ya estaba ocupada (D-32 a D-34 y `docs/10` a
  `docs/12` existían). Se incorporaron como `docs/13` a `docs/19` y sus decisiones como **D-35 a D-41**; toda
  referencia en código, pruebas y documentación usa la numeración nueva.
- **D-34** **La exportación es un CSV que Excel abre bien, no un `.xlsx`.** BOM UTF-8 para que las tildes
  no lleguen rotas, punto y coma como separador (el Excel en español usa la coma para los decimales), CRLF, y
  las celdas que empiezan con `=`, `+`, `-` o `@` se anteponen con comilla: Excel las ejecutaría como fórmula
  y los nombres vienen del portal. Un `.xlsx` de verdad exigiría una dependencia entera para el mismo
  resultado. La exportación usa **el mismo filtro que el tablero** (`tablero-filtros.ts`): lo que se baja es
  lo que se ve, sin paginar.
- **D-33** **Ni adjuntos ni exigencias en la revisión.** Decisión del usuario el 31-08-2026. Las bases se
  descargan del portal y **se analizan fuera de la plataforma**: RF-07 se descarta y el sistema no guarda
  archivos (el modelo `Attachment` queda en el schema sin pantalla, como los del histórico). Y el formulario
  de revisión deja de exigir motivo y nota de 20 caracteres al marcar viable o descartada: «se puede explicar
  por WhatsApp». Motivos y nota siguen disponibles, opcionales, para quien quiera dejar la memoria escrita.
- **D-32** **La red de seguridad es una pantalla, no un script.** «Todas las vistas» (`/vistas`) busca
  sobre las ~4.700 activas de `SeenTender` —lo que el radar vio, haya entrado o no— y permite traer una al
  tablero con un clic: la acción pide la ficha a la API en el momento, con el mismo cliente y ritmo del
  worker, y la crea con su puntaje real aunque esté bajo el umbral. El puntaje bajo no es un error: registra
  que la trajo una persona y no una regla, y la bitácora (`tender.pull`) queda como lista de falsos negativos
  documentados para ajustar las reglas. Nace de la auditoría D-31: esa revisión la hizo un script y debía
  poder hacerla el equipo.
- **D-31** **Los huecos del motor se buscan, no se esperan.** Auditoría del 31-08-2026 sobre las 4.721
  activas del día, por los dos lados. Las descartadas estaban bien descartadas; entre ellas aparecieron
  **seis falsos negativos reales**, todos huecos de escritura y no de criterio: el patrón de desarrollo no
  admitía artículos («desarrollo de **la** plataforma modular de compras» de ChileCompra, LR, puntuaba 0),
  faltaban `arriendo de sistema` —el alcance se llama «arriendo de sistemas»—, `suscripcion de sistema`,
  `contratacion de software`, `mejora evolutiva` y `migracion de datos`, y `plataforma` no estaba en la regla
  genérica. Con la corrección la selección sube de 27 a 34 sobre las mismas activas, sin que salga ninguna.
  Los seis quedaron como casos obligatorios en `tests/affinity.test.ts`. Un caso conocido que sigue fuera:
  «DESARROLLO DEL PROYECTO NUEVA OC» (869591-11), porque «desarrollo del proyecto» no dice software por sí
  solo; sus hermanas de familia sí entran y delatan al comprador.
- **D-30** **Comprar licencias, prestaciones o equipos no es software.** Tres exclusiones del 31-08-2026,
  cada una por una licitación real que sobraba en el tablero. **Licencias genéricas** («adquisición de
  licencias de software», «provisión de licencias», «compra de uso de»): es reventa; la regla vieja solo
  cubría marcas conocidas. A propósito no se excluye `licencia` sola ni `licenciamiento`: aparecen en
  sistemas legítimos (toma de horas de licencias de conducir, SaaS «con licenciamiento ilimitado»).
  **Exámenes de laboratorio y extrasistema**: comprar prestaciones médicas a terceros no es software, pero su
  texto habla de calidad y acreditación y sumaba por el tema. **Equipos tecnológicos y médicos**: hardware;
  atrapó de rebote un «mantenimiento de software de control» que resultó ser el firmware de un tomógrafo.
  Sobre las activas del día la selección baja de 34 a 26. Los casos quedan como obligatorios en
  `tests/affinity.test.ts`, incluido el positivo que protege «arriendo de software para gestión de licencias
  médicas».
- **D-29** **Un tema no es un sistema.** `acreditacion`, `inventario`, `expediente` y `oficina de partes`
  nombran de qué trata algo, no que sea software, y con peso 6 o 5 llegaban solos al umbral. El tablero tenía
  el arriendo de una embarcación, una acreditación de saberes lingüísticos y la reestructuración de una
  oficina de partes. Bajan a **peso 2**: solo entran acompañados de una palabra que sí diga sistema. Es lo
  que `docs/04` ya decía —«las verticales describen de qué trata el sistema, no reemplazan la exigencia de
  que sea un sistema»— y el motor no cumplía. Se agregan además dos exclusiones que faltaban: **ciberseguridad**,
  que D-18 dejó fuera del alcance sin darle una regla (entraban un WAF y un SIEM por la palabra `saas`), y
  **concesiones**, donde la contraparte opera un negocio en vez de entregar software. Sobre el barrido del
  27-08-2026 la selección baja de 25 a 19 de 40, y las seis diferencias quedan declaradas en
  `tests/baseline.test.ts`. Del tablero salieron 6 licitaciones; las 13 que también quedaron bajo el umbral
  pero ya tenían revisión se conservan, porque un cambio de regla no deshace lo que el equipo decidió.
- **D-28** **Las reglas tienen un orden explícito** (`AffinityRule.position`). No es cosmético: en los
  patrones de comprador gana el primero que coincide —un hospital dependiente de un municipio sigue siendo un
  hospital— y en las palabras clave el orden desempata los pesos iguales (`docs/04`). Hasta ahora las reglas se
  leían sin `ORDER BY` y funcionaba por casualidad, porque nadie las había editado nunca y el montón de
  Postgres coincidía con el orden de la semilla. La primera edición desde la pantalla lo habría roto en
  silencio: la fila editada se mueve de lugar y la clasificación cambia sin que nada lo anuncie.
- **D-27** **Tres pantallas: Tablero, Favoritas y Reglas.** Se descartan Histórico (RF-08), Auditoría (RF-13)
  y Configuración. Decisión del usuario el 2026-08-30: «no es necesario para un equipo de tres que siempre
  tiene comunicación». Lo que cada una aportaba no se pierde, cambia de lugar: el histórico de adjudicaciones
  ya se muestra donde se usa, en la ficha (RF-05); `AuditLog` se sigue escribiendo y se consulta contra la
  base si alguna vez hace falta; y los parámetros que vivían en Configuración son parte de RF-09, así que
  están en Reglas. Lo único que desaparece de verdad es la administración de usuarios, que con una sola
  cuenta compartida (D-22) no administra nada.
- **D-26** **Las favoritas son por perfil, no del equipo.** El estado compartido ya lo lleva
  `Tender.reviewStatus`: VIABLE significa que el equipo la sigue, asi que una favorita compartida seria lo
  mismo. Por perfil sirve para otra cosa: «quiero volver a esta» sin comprometer al equipo con un estado.
  `Favorite.profile` guarda el nombre del perfil, no un id de usuario, porque la cuenta es compartida (D-22).
- **D-25** **Sin endpoint de salud.** RF-14 se elimino: una sonda que nadie consulta es decorativa, y no hay
  monitoreo externo montado. La necesidad real —enterarse de que el barrido fallo— se cubre donde el equipo ya
  mira: el resumen diario por correo y la pantalla (RN-07). systemd cubre las caidas del proceso.
- **D-24** **Se elige un perfil al entrar** (Andres, Javiera, Francisco) y todo lo que se escriba queda a su
  nombre sin volver a preguntarlo. Resuelve la atribucion que la cuenta compartida (D-22) no da, sin administrar
  tres cuentas. La lista sale de `Setting.teamMembers`, no es texto libre.
  **No es un control de seguridad**: quien tiene la sesion compartida puede elegir cualquier perfil. Es una
  etiqueta para la bitacora, y como tal esta documentado en `docs/07`.
- **D-23** **La sesion dura 30 dias de inactividad**, con casilla «mantener la sesion iniciada» marcada por
  defecto. El plan eran 60 minutos, pero el equipo entra unas pocas veces por semana y reingresaba la clave
  en cada visita. Sin marcar la casilla la cookie muere al cerrar el navegador, para equipos prestados.
  Es una relajacion consciente sobre una cuenta compartida (D-22): se revierte cambiando un numero.
- **D-22** **Una sola cuenta compartida por el equipo**, en vez de una por persona. Decision del usuario tras
  descartar no tener autenticacion: la pagina no muestra solo datos publicos, sino los montos ofertados, las
  debilidades declaradas por escrito y la estrategia de seleccion. Y el subdominio no es secreto, porque
  Let's Encrypt publica todos los certificados en los logs de Certificate Transparency.
  La atribucion se resuelve aparte: **el autor de cada nota se elige al guardar la revision** y queda en
  `Review.authorName`, de una lista configurable en vez de texto libre.
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
- **T-17** Evaluar cuentas individuales. Con la cuenta compartida (D-22) la bitácora no puede decir quién
  inició sesión ni quién cambió una regla, y la norma de `docs/07` de «el revisor edita su propia nota dentro
  de las 24 horas» no se puede aplicar. El modelo ya lo soporta: son filas, no código.
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
- **2026-08-31** Autenticacion (RF-12). Better Auth 1.7.2 con correo y contrasena, una cuenta compartida
  (D-22), sin registro publico. Tres cosas que solo se supieron leyendo la version instalada en vez de la
  memoria: **(a)** en Next 16 `middleware` esta deprecado y se llama **`proxy`**; **(b)** `Account.issuer` es
  obligatorio en Better Auth 1.7 y vale `local:credential`, que se obtiene de `createLocalAccountIssuer` en
  vez de escribirlo a mano; **(c)** la sesion no devuelve `role` ni `active` salvo que se declaren en
  `user.additionalFields`. El esquema de las tablas se obtuvo llamando a `getAuthTables()` de la version
  instalada, no de ejemplos. Comprobado de punta a punta: entra con la clave correcta, rechaza la incorrecta
  y bloquea el registro publico.
- **2026-08-31** **Worker desplegado y corriendo en el VPS.** Barrido agendado cada dos horas en el minuto 15, hora de Chile. La base de produccion quedo con 50 licitaciones, 36 revisiones, 45 adjudicaciones historicas y las 20 reglas.
  Tres cosas que aparecieron al desplegar. **(a)** El problema de pnpm no era corepack: **pnpm 11 exige `node:sqlite`, que solo existe desde Node 22**, y corepack lo disfrazaba de un error de import dinamico. Se instalo Node 22 solo para el usuario `radar` (D-20). **(b)** `referencia/fetch.py` y `hist.py` **tenian el ticket de Mercado Publico hardcodeado**; commitearlos lo habria dejado en el historial de git para siempre, contra lo que dice `docs/09`. Ahora lo leen del entorno. **(c)** El `.env` del servidor, creado desde Windows en el aprovisionamiento, tenia **10 retornos de carro**. systemd los normaliza, asi que no se manifesto, pero un `
` al final del ticket habria roto las llamadas a la API sin decir por que. Archivo normalizado a LF.
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
