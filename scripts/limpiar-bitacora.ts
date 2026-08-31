/**
 * Borra de la bitacora las revisiones repetidas.
 *
 *   pnpm bitacora:limpiar             muestra que borraria, sin tocar nada
 *   pnpm bitacora:limpiar -- --aplicar   las borra
 *
 * Repetida: identica a la revision inmediatamente anterior de la misma
 * licitacion (mismo estado, mismos motivos, misma nota). Son el rastro del
 * boton apretado varias veces, no decisiones. Se conserva siempre la primera.
 *
 * No toca el estado del tablero: borrar una copia no cambia lo que la copia
 * decia.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";

async function main(): Promise<void> {
  const aplicar = process.argv.includes("--aplicar");

  const revisiones = await prisma.review.findMany({
    orderBy: [{ tenderId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      tenderId: true,
      status: true,
      reasons: true,
      note: true,
      authorName: true,
      createdAt: true,
      tender: { select: { code: true } },
    },
  });

  const repetidas: typeof revisiones = [];
  for (let i = 1; i < revisiones.length; i++) {
    const previa = revisiones[i - 1];
    const actual = revisiones[i];
    if (
      actual.tenderId === previa.tenderId &&
      actual.status === previa.status &&
      actual.note === previa.note &&
      actual.reasons.length === previa.reasons.length &&
      actual.reasons.every((r, j) => r === previa.reasons[j])
    ) {
      repetidas.push(actual);
    }
  }

  console.log(`${revisiones.length} revisiones · ${repetidas.length} repetidas\n`);
  for (const r of repetidas) {
    console.log(`  ${r.tender.code.padEnd(18)} ${r.status.padEnd(10)} ${r.authorName.padEnd(10)} ${r.createdAt.toISOString()}`);
  }

  if (!aplicar) {
    console.log("\nNada se toco. Para borrarlas: pnpm bitacora:limpiar -- --aplicar");
    return;
  }
  if (repetidas.length === 0) {
    console.log("\nNo hay nada que borrar.");
    return;
  }

  const { count } = await prisma.review.deleteMany({
    where: { id: { in: repetidas.map((r) => r.id) } },
  });
  console.log(`\n${count} borradas. La primera de cada racha se conserva.`);
}

main()
  .catch((e) => {
    console.error("no se pudo limpiar la bitacora:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
