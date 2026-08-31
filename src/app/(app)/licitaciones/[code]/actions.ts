/**
 * Guardar una revision (RF-06, docs/07).
 *
 * El autor no viene del formulario: sale del perfil elegido al entrar (D-24).
 * Enviarlo desde el cliente permitiria firmar a nombre de otro con solo editar
 * el HTML, y aunque la sesion es compartida, eso convertiria la bitacora en algo
 * que ni siquiera sirve como etiqueta.
 */
"use server";

import { revalidatePath } from "next/cache";
import type { ReviewStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { perfilParaEscribir } from "@/lib/perfil";
import { getSession } from "@/lib/session";
import { ESTADOS, esMotivoValido, validarRevision } from "@/lib/reviews";

export interface EstadoFormulario {
  ok: boolean;
  mensaje?: string;
  errores?: Partial<Record<"motivos" | "nota" | "general", string>>;
}

export async function guardarRevision(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const session = await getSession();
  if (!session) return { ok: false, errores: { general: "La sesión expiró. Vuelve a entrar." } };

  const autor = await perfilParaEscribir();
  if (!autor) {
    return { ok: false, errores: { general: "Elige un perfil antes de guardar." } };
  }

  const code = String(formData.get("code") ?? "");
  const estado = String(formData.get("estado") ?? "") as ReviewStatus;
  const nota = String(formData.get("nota") ?? "");
  // Solo se aceptan codigos del catalogo: lo que venga de mas se descarta.
  const motivos = formData.getAll("motivos").map(String).filter(esMotivoValido);

  if (!(estado in ESTADOS)) {
    return { ok: false, errores: { general: "Ese estado no existe." } };
  }

  const problemas = validarRevision({ estado, motivos, nota });
  if (problemas.length > 0) {
    const errores: EstadoFormulario["errores"] = {};
    for (const p of problemas) errores[p.campo] = p.mensaje;
    return { ok: false, errores };
  }

  const tender = await prisma.tender.findUnique({ where: { code }, select: { id: true } });
  if (!tender) return { ok: false, errores: { general: "Esa licitación ya no existe." } };

  // El estado del tablero y la revision se escriben juntos: si se separan, el
  // tablero puede quedar mostrando un estado que ninguna revision respalda
  // (invariante de docs/02).
  await prisma.$transaction([
    prisma.review.create({
      data: {
        tenderId: tender.id,
        status: estado,
        authorName: autor,
        reasons: motivos,
        note: nota.trim(),
        userId: session.user.id,
      },
    }),
    prisma.tender.update({ where: { id: tender.id }, data: { reviewStatus: estado } }),
    prisma.auditLog.create({
      data: {
        userName: autor,
        action: "review.create",
        entity: "Tender",
        entityId: tender.id,
        detail: `${ESTADOS[estado].etiqueta}${motivos.length ? ` · ${motivos.join(", ")}` : ""}`,
      },
    }),
  ]);

  revalidatePath(`/licitaciones/${code}`);
  revalidatePath("/");

  return { ok: true, mensaje: `Guardado como ${ESTADOS[estado].etiqueta.toLowerCase()}.` };
}
