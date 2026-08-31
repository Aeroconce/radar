/**
 * Perfil activo (D-24).
 *
 * La cuenta es una sola y compartida (D-22), asi que al entrar se elige quien
 * eres. Todo lo que se escriba despues —revisiones, notas, adjuntos— queda a
 * nombre de ese perfil, sin volver a preguntarlo.
 *
 * Va en una cookie porque el servidor necesita leerlo en cada Server Action;
 * `localStorage` no le sirve. Es `httpOnly` para que el navegador no lo cambie
 * por accidente desde el cliente, pero **no es un control de seguridad**: quien
 * tiene la sesion compartida puede elegir cualquier perfil. Es una etiqueta para
 * la bitacora, y como tal esta documentado en docs/07.
 */
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SETTING_KEYS } from "@/lib/settings";

export const PERFIL_COOKIE = "radar_perfil";

/** Si no hay lista configurada, no se inventa una: la interfaz lo dira. */
export async function perfilesDisponibles(): Promise<string[]> {
  const fila = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.teamMembers } });
  const valor = fila?.value;
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** Perfil elegido, o `null` si todavia no se elige. */
export async function perfilActivo(): Promise<string | null> {
  const store = await cookies();
  return store.get(PERFIL_COOKIE)?.value ?? null;
}

/**
 * Perfil para escribir en la base. Se valida contra la lista: una cookie con un
 * nombre que ya no existe no debe terminar como autor de una revision.
 */
export async function perfilParaEscribir(): Promise<string | null> {
  const actual = await perfilActivo();
  if (!actual) return null;
  const validos = await perfilesDisponibles();
  return validos.includes(actual) ? actual : null;
}
