/**
 * Vuelve a puntuar el tablero con las reglas de ahora (RF-09).
 *
 *   pnpm tablero:recalcular
 *
 * Es el boton «Recalcular el tablero» de la pantalla de reglas, desde la
 * consola. Existe para el despliegue: `pnpm reglas:sincronizar` deja las reglas
 * nuevas en la base, pero lo que ya esta en el tablero conserva el puntaje
 * viejo hasta que alguien recalcule (docs/04), y un despliegue no deberia
 * depender de que alguien entre a apretar un boton.
 *
 * No borra nada: lo que baja del umbral se queda con su puntaje nuevo. Para
 * sacarlo esta `pnpm tablero:limpiar`.
 */
import "dotenv/config";
import { prisma } from "@/lib/db";
import { recalcularTablero } from "@/lib/recalculo";
import { loadRules, loadSettings } from "@/lib/settings";

async function main(): Promise<void> {
  const [reglas, settings] = await Promise.all([loadRules(), loadSettings()]);
  const r = await recalcularTablero(reglas, settings);

  await prisma.auditLog.create({
    data: {
      userName: "consola",
      action: "rules.recalculate",
      entity: "Tender",
      entityId: null,
      detail: `${r.revisadas} revisadas · ${r.cambiadas} cambiadas · ${r.bajoUmbral} bajo el umbral`,
    },
  });

  console.log(`${r.revisadas} en el tablero · ${r.cambiadas} cambiaron de puntaje, vertical o etiquetas · ${r.bajoUmbral} bajo el umbral`);
  if (r.bajoUmbral > 0) {
    console.log("Las que quedaron bajo el umbral siguen en el tablero. Para sacarlas: pnpm tablero:limpiar");
  }
}

main()
  .catch((e) => {
    console.error("no se pudo recalcular el tablero:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
