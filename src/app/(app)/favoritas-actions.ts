/**
 * Marcar y desmarcar favoritas (D-24).
 *
 * La favorita es del perfil activo, no del equipo: `Favorite.profile` guarda el
 * nombre elegido al entrar, no un id de usuario, porque la cuenta es compartida.
 */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { perfilParaEscribir } from "@/lib/perfil";
import { getSession } from "@/lib/session";

export interface ResultadoFavorita {
  ok: boolean;
  favorita?: boolean;
  error?: string;
}

export async function alternarFavorita(code: string): Promise<ResultadoFavorita> {
  const session = await getSession();
  if (!session) return { ok: false, error: "La sesión expiró." };

  const profile = await perfilParaEscribir();
  if (!profile) return { ok: false, error: "Elige un perfil primero." };

  const tender = await prisma.tender.findUnique({ where: { code }, select: { id: true } });
  if (!tender) return { ok: false, error: "Esa licitación ya no existe." };

  const existente = await prisma.favorite.findUnique({
    where: { tenderId_profile: { tenderId: tender.id, profile } },
  });

  if (existente) {
    await prisma.favorite.delete({ where: { id: existente.id } });
  } else {
    await prisma.favorite.create({ data: { tenderId: tender.id, profile } });
  }

  revalidatePath("/");
  revalidatePath("/favoritas");
  revalidatePath(`/licitaciones/${code}`);

  return { ok: true, favorita: !existente };
}
