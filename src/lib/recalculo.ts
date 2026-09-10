/**
 * Volver a puntuar las licitaciones que ya estan en el tablero (RF-09, docs/04).
 *
 * Hace falta porque el barrido no las vuelve a mirar: una vez que una licitacion
 * existe en `Tender`, solo se refresca si cambio su fecha de cierre (docs/05).
 * Sin esto, editar una regla no se nota en el tablero hasta que aparezca una
 * licitacion nueva, y quien la edito no tiene como saber si sirvio.
 *
 * No borra nada. Una que baja del umbral **se queda**, con su puntaje nuevo:
 * alguien pudo haberla revisado, y las decisiones del equipo no las deshace un
 * cambio de regla. Se informa cuantas quedaron asi.
 *
 * Es local: usa el nombre y la descripcion ya guardados, sin llamar a la API.
 *
 * Vive aparte de la accion de la pantalla para que el mismo calculo sirva desde
 * la consola (`pnpm tablero:recalcular`), donde no hay sesion: un despliegue
 * que cambia las reglas de la semilla necesita recalcular sin que alguien entre
 * a apretar el boton.
 */
import {
  classifyBuyer,
  classifyVertical,
  detectIncumbentSignals,
  detectOpportunitySignals,
} from "@/lib/affinity/classify";
import { evaluate, withStructural, type Rule, type Thresholds } from "@/lib/affinity/rules";
import { computeStructural, type StructuralParams } from "@/lib/affinity/structural";
import { prisma } from "@/lib/db";

export interface Recalculo {
  /** Licitaciones del tablero que se volvieron a puntuar. */
  revisadas: number;
  /** Las que cambiaron de puntaje, vertical, comprador o etiquetas. */
  cambiadas: number;
  /** Las que quedaron bajo el umbral. Se quedan igual. */
  bajoUmbral: number;
}

const mismaLista = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export async function recalcularTablero(
  reglas: Rule[],
  params: Thresholds & StructuralParams,
): Promise<Recalculo> {
  const fichas = await prisma.tender.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      buyerOrganism: true,
      buyerUnit: true,
      buyerType: true,
      estimatedAmount: true,
      durationValue: true,
      durationUnit: true,
      processType: true,
      items: true,
      affinityScore: true,
      textScore: true,
      structuralScore: true,
      structuralTags: true,
      vertical: true,
      incumbentSignals: true,
      opportunitySignals: true,
    },
  });

  let cambiadas = 0;
  let bajoUmbral = 0;

  for (const t of fichas) {
    const texto = `${t.name} ${t.description}`;
    const monto = t.estimatedAmount != null ? Number(t.estimatedAmount) : null;
    const porTexto = evaluate({ text: texto, amount: monto, processType: t.processType }, reglas, params);
    const vertical = classifyVertical(texto, reglas);
    const buyerType = classifyBuyer(t.buyerOrganism, t.buyerUnit, reglas);
    const incumbentSignals = detectIncumbentSignals(texto, reglas);
    const opportunitySignals = detectOpportunitySignals(texto, reglas);
    // Las senales de la ficha se recalculan desde lo guardado: monto, duracion,
    // tipo e items ya vinieron con la ficha, no hace falta pedirla de nuevo.
    const estructural = computeStructural(
      {
        name: t.name,
        description: t.description,
        estimatedAmount: monto,
        durationValue: t.durationValue,
        durationUnit: t.durationUnit,
        processType: t.processType,
        items: t.items,
        opportunitySignals,
      },
      params,
    );
    const veredicto = withStructural(porTexto, estructural, params);

    if (!veredicto.selected) bajoUmbral++;

    // Las etiquetas tambien cuentan: una regla nueva de senales tiene que
    // notarse en el tablero aunque el puntaje no se mueva.
    const igual =
      veredicto.score === t.affinityScore &&
      porTexto.score === t.textScore &&
      estructural.score === t.structuralScore &&
      mismaLista(estructural.tags, t.structuralTags) &&
      vertical === t.vertical &&
      buyerType === t.buyerType &&
      mismaLista(incumbentSignals, t.incumbentSignals) &&
      mismaLista(opportunitySignals, t.opportunitySignals);
    if (igual) continue;

    cambiadas++;
    await prisma.tender.update({
      where: { id: t.id },
      data: {
        affinityScore: veredicto.score,
        textScore: porTexto.score,
        structuralScore: estructural.score,
        structuralTags: estructural.tags,
        matchedTerms: veredicto.matchedTerms,
        outOfScale: veredicto.outOfScale,
        vertical,
        buyerType,
        incumbentSignals,
        opportunitySignals,
      },
    });
  }

  return { revisadas: fichas.length, cambiadas, bajoUmbral };
}
