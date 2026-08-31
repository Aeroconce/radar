/**
 * Deja en la base las reglas de `docs/04` (RF-09).
 *
 *   pnpm reglas:sincronizar
 *
 * Existe porque `pnpm seed` hace mucho mas: pide fichas a la API, carga el
 * historico y las revisiones del equipo. Cuando lo unico que cambio son las
 * reglas, correr todo eso es caro y arriesgado.
 *
 * Solo toca las reglas de la semilla. Las que alguien edito desde la pantalla
 * llevan su nombre en `updatedBy` y se quedan como estan: el codigo no pisa una
 * decision que se tomo despues.
 */
import "dotenv/config";
import { INITIAL_RULES, SEED_AUTHOR } from "@/lib/affinity/initial-rules";
import { prisma } from "@/lib/db";

async function main(): Promise<void> {
  const propias = await prisma.affinityRule.count({ where: { updatedBy: SEED_AUTHOR } });
  const ajenas = await prisma.affinityRule.count({ where: { NOT: { updatedBy: SEED_AUTHOR } } });

  await prisma.affinityRule.deleteMany({ where: { updatedBy: SEED_AUTHOR } });
  await prisma.affinityRule.createMany({
    // El indice es la posicion: el orden de docs/04 decide los empates de peso
    // y, en las reglas de comprador, cual gana (D-28).
    data: INITIAL_RULES.map((r, i) => ({
      kind: r.kind,
      vertical: r.vertical ?? null,
      buyerType: r.buyerType ?? null,
      pattern: r.pattern,
      weight: r.weight,
      position: i + 1,
      updatedBy: SEED_AUTHOR,
    })),
  });

  console.log(`${propias} reglas de la semilla reemplazadas por ${INITIAL_RULES.length}`);
  if (ajenas > 0) {
    console.log(`${ajenas} editadas desde la pantalla quedaron intactas`);
  }
}

main()
  .catch((e) => {
    console.error("no se pudieron sincronizar las reglas:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
