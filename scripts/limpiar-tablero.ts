/**
 * Saca del tablero lo que las reglas de ahora ya no seleccionarian.
 *
 *   pnpm tablero:limpiar             muestra que sacaria, sin tocar nada
 *   pnpm tablero:limpiar -- --aplicar   lo saca
 *
 * Cambiar una regla no vacia el tablero: las licitaciones que entraron con las
 * reglas viejas se quedan, porque el barrido no vuelve a mirar lo que ya existe
 * (docs/05). Despues de acotar una regla hay que sacarlas a mano, y esto es esa
 * mano.
 *
 * **Solo saca lo que nadie toco.** Si tiene una revision escrita, un adjunto, una
 * favorita o un estado distinto de «nueva», se queda: el equipo decidio algo
 * sobre ella y eso no lo borra un cambio de regla. Se informa cuantas quedaron
 * asi, para que el recorte nunca sea silencioso.
 *
 * Lo que se saca no vuelve: `SeenTender` conserva que la vimos, y con el puntaje
 * nuevo ya no pasa el umbral en el proximo barrido.
 */
import "dotenv/config";
import { evaluate } from "@/lib/affinity/rules";
import { prisma } from "@/lib/db";
import { loadRules, loadSettings } from "@/lib/settings";

async function main(): Promise<void> {
  const aplicar = process.argv.includes("--aplicar");
  const [rules, settings] = await Promise.all([loadRules(), loadSettings()]);

  const fichas = await prisma.tender.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      estimatedAmount: true,
      processType: true,
      affinityScore: true,
      reviewStatus: true,
      _count: { select: { reviews: true, attachments: true, favorites: true } },
    },
    orderBy: { affinityScore: "asc" },
  });

  const sacar: Array<{ id: string; code: string; name: string; antes: number; ahora: number }> = [];
  const protegidas: Array<{ code: string; name: string; ahora: number; motivo: string }> = [];

  for (const t of fichas) {
    const veredicto = evaluate(
      {
        text: `${t.name} ${t.description}`,
        amount: t.estimatedAmount != null ? Number(t.estimatedAmount) : null,
        processType: t.processType,
      },
      rules,
      settings,
    );
    if (veredicto.selected) continue;

    const motivo =
      t._count.reviews > 0
        ? "tiene revisiones"
        : t._count.attachments > 0
          ? "tiene adjuntos"
          : t._count.favorites > 0
            ? "esta marcada como favorita"
            : t.reviewStatus !== "NEW"
              ? `esta en estado ${t.reviewStatus}`
              : null;

    if (motivo) protegidas.push({ code: t.code, name: t.name, ahora: veredicto.score, motivo });
    else sacar.push({ id: t.id, code: t.code, name: t.name, antes: t.affinityScore, ahora: veredicto.score });
  }

  console.log(`${fichas.length} en el tablero · ${sacar.length} bajo el umbral y sin tocar\n`);
  for (const t of sacar) {
    console.log(`  ${String(t.antes).padStart(3)} → ${String(t.ahora).padStart(3)}  ${t.code.padEnd(18)} ${t.name.slice(0, 70)}`);
  }

  if (protegidas.length > 0) {
    console.log(`\n${protegidas.length} tambien quedaron bajo el umbral pero se quedan:`);
    for (const t of protegidas) {
      console.log(`  ${String(t.ahora).padStart(3)}  ${t.code.padEnd(18)} ${t.motivo}`);
    }
  }

  if (!aplicar) {
    console.log("\nNada se toco. Para sacarlas: pnpm tablero:limpiar -- --aplicar");
    return;
  }

  if (sacar.length === 0) {
    console.log("\nNo hay nada que sacar.");
    return;
  }

  const { count } = await prisma.tender.deleteMany({ where: { id: { in: sacar.map((t) => t.id) } } });
  await prisma.auditLog.create({
    data: {
      userName: "consola",
      action: "board.cleanup",
      entity: "Tender",
      entityId: null,
      detail: `${count} sacadas del tablero por quedar bajo el umbral: ${sacar.map((t) => t.code).join(", ")}`,
    },
  });
  console.log(`\n${count} sacadas del tablero. Queda anotado en la bitacora.`);
}

main()
  .catch((e) => {
    console.error("no se pudo limpiar el tablero:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
