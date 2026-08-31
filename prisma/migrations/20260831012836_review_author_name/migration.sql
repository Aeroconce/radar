-- Se agrega `authorName` a `Review` en tres pasos porque la tabla ya tiene filas.
--
-- La sesion del equipo es compartida (D-22), asi que el autor de una nota no se
-- puede derivar de ella: se elige en el modal al guardar. Las revisiones ya
-- cargadas vienen de la captura colectiva del 2026-08-31 y no tienen autor
-- individual conocido, asi que quedan como "Equipo".
--
-- El valor por defecto se retira al final: si quedara, una revision nueva sin
-- autor pasaria en silencio y el campo no servirian de nada.

ALTER TABLE "Review" ADD COLUMN "authorName" TEXT NOT NULL DEFAULT 'Equipo';

UPDATE "Review" SET "authorName" = 'Equipo' WHERE "authorName" = '';

ALTER TABLE "Review" ALTER COLUMN "authorName" DROP DEFAULT;
