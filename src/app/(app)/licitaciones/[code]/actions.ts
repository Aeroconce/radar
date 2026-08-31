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
import { ESTADOS, esMotivoValido } from "@/lib/reviews";

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

  // Motivos y nota son opcionales (D-33): la justificacion se conversa fuera.

  const tender = await prisma.tender.findUnique({
    where: { code },
    select: {
      id: true,
      reviewStatus: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, reasons: true, note: true } },
    },
  });
  if (!tender) return { ok: false, errores: { general: "Esa licitación ya no existe." } };

  /*
   * Una revision que no agrega nada no se registra. Sin esto, apretar Guardar
   * tres veces deja tres filas identicas en la bitacora, y la bitacora es la
   * memoria: tres "Perdida · Francisco" seguidas no cuentan nada.
   *
   * Se rechazan dos formas de repeticion: guardar el estado actual sin motivos
   * ni nota (no hay decision nueva), y guardar algo identico a la ultima
   * revision (el doble clic).
   */
  const notaLimpia = nota.trim();
  const sinNada = estado === tender.reviewStatus && motivos.length === 0 && notaLimpia === "";
  const ultima = tender.reviews[0];
  const identica =
    ultima !== undefined &&
    ultima.status === estado &&
    ultima.note === notaLimpia &&
    ultima.reasons.length === motivos.length &&
    ultima.reasons.every((r, i) => r === motivos[i]);

  if (sinNada || identica) {
    return { ok: true, mensaje: "Ya estaba registrado así: no se agregó nada a la bitácora." };
  }

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
