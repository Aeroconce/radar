# 15 — Señales estructurales (D-41)

## Por qué

El motor puntúa solo texto. Pero `Tender` ya guarda `estimatedAmount`, `durationValue`, `durationUnit`,
`processType` e `items`, y en la muestra de septiembre esos cuatro campos separaron viables de trampas con
más precisión que cualquier palabra:

| Señal | Viables (5) | Trampas (14) |
|---|---|---|
| Canon mensual entre $0,8M y $3,5M | 5 de 5 | 1 de 14 |
| Tipo de proceso LR | 0 de 5 | 4 de 14 (todas descarte) |
| Duración vacía o 0 con "adquisición" | 0 de 5 | 4 de 14 |
| Ningún ítem en categoría de software o servicios informáticos | 0 de 5 | 5 de 14 |

## Qué se calcula

Un `structuralScore` entero y una lista `structuralTags`, ambos guardados en `Tender`, calculados en el
worker **después** de pedir la ficha (el listado de activas no trae monto ni ítems). El puntaje mostrado
pasa a ser `affinityScore = textScore + structuralScore`; `textScore` se guarda aparte para que la vista
previa de reglas siga mostrando lo que las reglas hacen, sin mezclar.

### Canon mensual implícito

```ts
function mesesDe(t: Tender): number | null {
  if (!t.durationValue) return null;
  switch (t.durationUnit) {
    case "dias":  return t.durationValue / 30;
    case "anos":  return t.durationValue * 12;
    default:      return t.durationValue; // meses
  }
}
const canon = t.estimatedAmount && mesesDe(t) ? Number(t.estimatedAmount) / mesesDe(t)! : null;
// Setting: canonMin = 800_000, canonMax = 3_500_000
if (canon !== null) {
  if (canon >= canonMin && canon <= canonMax) { score += 2; tags.push("canon ok"); }
  else { score -= 2; tags.push(`canon ${(canon / 1e6).toFixed(1)}M`); }
}
```

Bajo la banda es reventa de licencia (ITAM JUNAEB $0,6M, UFRO $0,7M). Sobre la banda con texto de sistema
es ERP de incumbente o sistema crítico (Bulnes $7,6M, Estación Central $17M, Peñalolén $6,9M, Exequiel
$10M). Los límites viven en `Setting` para ajustarlos con datos, igual que el umbral.

### Tipo de proceso

```ts
if (t.processType === "LR") { score -= 2; tags.push("LR"); }
```

Sobre 5.000 UTM. Las cuatro LR de la muestra fueron integrales o críticas. No se excluye: se resta y se
etiqueta, porque un LR de módulo único puede existir.

### Compra única

```ts
if (!mesesDe(t) && /adquisicion/.test(normalize(t.name))) { score -= 2; tags.push("compra unica"); }
```

"Adquisición" sin duración es un bien. Atrapa servidor, CAD, implementación deportiva y seguro sin depender
del vocabulario. Ojo: Alto Hospicio se llamaba "Adquisición de Sistema de Control de Asistencia" y era
arriendo a 24 meses; la duración la salva, y por eso la regla exige **ambas** condiciones.

### Categoría de los ítems

`items` es `Items.Listado`. Cada ítem trae `Categoria` como ruta ("Tecnologías de la información,
telecomunicaciones y radiodifusión / Software / Software de gestión").

```ts
const SOFTWARE_CATS = [
  /^tecnologias de la informacion.*\/ software/,
  /servicios informaticos/,
  /ingenieria en computacion e informatica/,
];
const HARDWARE_CATS = [
  /^equipos/, /computadores/, /^muebles/, /^vehiculos/, /^ropa/, /deportivos/,
  /^seguros/, /publicidad/, /instrumentos/,
];
const cats = (t.items ?? []).map((i) => normalize(i.Categoria ?? ""));
if (cats.length && !cats.some((c) => SOFTWARE_CATS.some((r) => r.test(c)))) {
  score -= 4; tags.push("sin item de software");
}
if (cats.some((c) => HARDWARE_CATS.some((r) => r.test(c)))) {
  score -= 2; tags.push("item de bienes");
}
```

Es la señal más barata y más fuerte: el comprador clasifica lo que compra, y casi nunca se equivoca.

### Descripción no informativa

```ts
if (/requerimiento adjunto|segun (bases|anexo)s? adjunt|ver (anexo|adjunto)/.test(normalize(t.description))) {
  tags.push("sin descripcion util");
}
```

No resta: etiqueta. UFRO decía "DE ACUERDO A REQUERIMIENTO ADJUNTO" y puntuaba 11 solo por el nombre. Quien
revise debe saber que el texto no dice nada y que hay que abrir las bases sí o sí.

### Señales de oportunidad (D-40)

Las etiquetas de `opportunitySignals` no puntúan por regla, pero aquí sí:

```ts
if (t.opportunitySignals.some((s) => /menor tamano|emt|182/.test(normalize(s)))) { score += 2; tags.push("reservada EMT"); }
if (t.opportunitySignals.some((s) => /llamado|desierta|sin efecto/.test(normalize(s)))) { score += 1; tags.push("relanzamiento"); }
```

## Dónde vive

- `worker/`: después del `upsert` de la ficha, `computeStructural(tender)` y guardar `structuralScore`,
  `structuralTags`, `textScore`, `affinityScore`.
- «Recalcular el tablero»: recalcula texto **y** estructural desde `raw`, sin llamar a la API.
- `Setting`: `canonMin`, `canonMax`, `lrPenalty` (2), `noSoftwareItemPenalty` (4).
- Tablero: las `structuralTags` se muestran junto a las de incumbente y oportunidad, con el mismo estilo.

## Interacción con `outOfScale`

`outOfScale` (sobre `maxAmount`, −2) se mantiene. La banda de canon la complementa: un contrato de $400M a
60 meses no está fuera de escala por monto total pero sí por canon.

## Resultado sobre la muestra

Con las reglas del docs/14 más esto, las cinco viables suben a 14–18, doce trampas bajan del umbral, y UFRO
y Bulnes quedan en 9 con etiqueta explicativa. Tabla completa en `13-diagnostico-precision.md`.
