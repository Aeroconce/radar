# 16 — Revisión estructurada: lo que decide y no está en el texto

## Por qué

De los 14 descartes de septiembre, 5 no se pueden ver desde la API bajo ninguna regla, porque la causa está
en las bases:

| Caso | Lo que lo mató | Dónde estaba |
|---|---|---|
| UFRO | 20 clientes con la plataforma en operación como admisibilidad | Especificaciones técnicas, 9.1 |
| Bulnes | Pago solo desde el acta de recepción de la implementación completa | Especificaciones, letra g) |
| JUNAEB GRC | Profesional con 2 años acreditados en SGSI como admisibilidad | Bases técnicas, 3.7 |
| San Bernardo (riesgo) | Menos del 79% de especificaciones = excluido | Bases administrativas, 9.7.1.2 |
| Tamarugal | Levantamiento físico de 13.000 bienes en Tarapacá | Bases técnicas, 5.2 |

Y las 5 viables comparten cuatro rasgos que tampoco están en el texto: experiencia como puntaje y no como
admisibilidad, verificación por declaración o demo y no por clientes, sin integraciones con terceros
propietarios, y pago desde el mes 1.

Hoy `Review` guarda `status`, `reasons` (códigos), `note` libre y `authorName`. La nota libre no se puede
consultar. Cuatro campos estructurados convierten cada revisión en dato, y en tres meses el radar sabe qué
organismos exigen demo, cuánto pesa la experiencia por tipo de comprador y qué integraciones se repiten.

## Modelo

Un registro por licitación, separado de `Review` (que es un historial de notas) y editable mientras la
licitación esté abierta:

```prisma
model Viabilidad {
  id        String   @id @default(cuid())
  tenderId  String   @unique
  tender    Tender   @relation(fields: [tenderId], references: [id])

  /// Cómo pesa la experiencia previa.
  experiencia        ExperienciaRol   @default(DESCONOCIDO)
  /// Peso en la evaluación, 0–100. Null si es admisibilidad.
  experienciaPeso    Int?
  /// Cómo se acredita el cumplimiento técnico.
  verificacion       Verificacion     @default(DESCONOCIDO)
  /// Integraciones con sistemas de terceros nombradas en las bases.
  integraciones      String[]
  integracionRiesgo  IntegracionRiesgo @default(NINGUNA)
  /// Cuándo empieza a pagarse.
  pago               ModeloPago       @default(DESCONOCIDO)
  /// Garantía de fiel cumplimiento, pesos. Null si no se exige.
  garantiaMonto      Decimal?         @db.Decimal(16, 2)
  /// Canon mensual estimado si es arriendo.
  canonMensual       Decimal?         @db.Decimal(16, 2)
  /// Trabajo en terreno obligatorio (levantamientos, instalación, capacitación presencial).
  terreno            Boolean          @default(false)
  /// Quién es el proveedor actual, si se sabe.
  incumbente         String           @default("")

  updatedBy  String
  updatedAt  DateTime @updatedAt
}

enum ExperienciaRol { ADMISIBILIDAD PUNTAJE NO_EXIGE DESCONOCIDO }
enum Verificacion   { DECLARACION DEMO_EN_VIVO DEMO_PRESENCIAL CLIENTES_EN_OPERACION DESCONOCIDO }
enum IntegracionRiesgo { NINGUNA API_GOBIERNO TERCERO_PROPIETARIO CLINICA DESCONOCIDO }
enum ModeloPago     { MENSUAL_DESDE_INICIO HITOS POST_IMPLEMENTACION UNICO DESCONOCIDO }
```

`API_GOBIERNO` cubre Clave Única, FirmaGob, Doc Digital, Mercado Público: documentadas y estándar.
`TERCERO_PROPIETARIO` cubre CAS Chile, terminales OEM, dispensadores: dependes de un competidor.
`CLINICA` cubre RCE, LIS, RIS/PACS: descarte.

## Catálogo de razones (`reasons`) ampliado

Códigos nuevos para `docs/07`, uno por patrón de descarte observado:

| Código | Significa | Caso |
|---|---|---|
| `EXP_ADMISIBILIDAD` | Experiencia o clientes exigidos como admisibilidad | UFRO |
| `PAGO_POST_IMPLEMENTACION` | Sin pago hasta recepción de la implementación completa | Bulnes |
| `INTEGRACION_CLINICA` | Integración obligatoria con sistema clínico | Peñalolén, Exequiel |
| `INTEGRACION_PROPIETARIA` | Dependencia de proveedor competidor | Alto Hospicio (CAS Chile) |
| `PRODUCTO_TERCERO` | Reventa de licencia o producto comercial | JUNAEB ITAM, Pichilemu |
| `BIEN_FISICO` | Compra de equipos o insumos | Servidor, IND, seguro |
| `PLATAFORMA_INTEGRAL` | ERP de incumbente, decenas de módulos en producción | Bulnes, Estación Central |
| `STAFFING` | Suministro de personal | San Borja |
| `TERRENO` | Operación física dominante | Tamarugal |
| `PROFESIONAL_EXIGIDO` | Perfil profesional acreditado como admisibilidad | JUNAEB GRC |
| `RESERVA_EMT` | Reservada a empresas de menor tamaño (positivo) | JUNAEB GRC |

## Interfaz

En `licitaciones/[code]/review-form.tsx`, un bloque «Viabilidad» sobre la nota, con cuatro selectores y
dos campos numéricos. Se llena en los diez minutos de lectura de bases y antes de cualquier consulta al
foro. Los cuatro selectores tienen valor por defecto DESCONOCIDO para que guardar sin llenar no mienta.

En el tablero, un semáforo derivado, sin tocar la afinidad:

- **Rojo** si `experiencia = ADMISIBILIDAD`, `verificacion = CLIENTES_EN_OPERACION`,
  `integracionRiesgo = CLINICA` o `pago = POST_IMPLEMENTACION`.
- **Ámbar** si `integracionRiesgo = TERCERO_PROPIETARIO`, `verificacion = DEMO_PRESENCIAL` o `terreno`.
- **Verde** si `experiencia ∈ {PUNTAJE, NO_EXIGE}`, `verificacion ∈ {DECLARACION, DEMO_EN_VIVO}`,
  `integracionRiesgo ∈ {NINGUNA, API_GOBIERNO}` y `pago ∈ {MENSUAL_DESDE_INICIO, HITOS}`.

Contra la muestra: las cinco viables salen verdes o ámbar; los cinco descartes "invisibles" salen rojos.

## Lo que esto habilita en tres meses

- "¿Qué porcentaje de municipalidades exige demo?" → filtro por `buyerType` y `verificacion`.
- "¿Cuánto pesa la experiencia en SLEP?" → promedio de `experienciaPeso` por organismo.
- "¿Qué integraciones se repiten?" → conteo sobre `integraciones`.
- Reglas nuevas con evidencia: si tres licitaciones con "plataforma tecnológica tipo SaaS" resultaron
  `CLIENTES_EN_OPERACION`, esa frase merece etiqueta automática.

## Regla de uso

Ninguna licitación pasa a VIABLE con un campo en DESCONOCIDO. Es la única disciplina que hace que el dato
sirva.
