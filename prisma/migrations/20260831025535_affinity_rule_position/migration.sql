-- AlterTable
ALTER TABLE "AffinityRule" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AffinityRule_kind_position_idx" ON "AffinityRule"("kind", "position");

-- Relleno: las reglas se sembraron en el orden de docs/04 y nunca se editaron,
-- asi que el orden por id es el que el motor viene usando de hecho. Se fija
-- explicitamente para que editarlas deje de reordenarlas.
UPDATE "AffinityRule" AS r
SET "position" = n.rn
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM "AffinityRule") AS n
WHERE r.id = n.id;
