/**
 * Sesion del lado del servidor (docs/09).
 *
 * El proxy solo comprueba que exista la cookie; la validacion de verdad ocurre
 * aqui, contra la base. "La interfaz oculta; el servidor niega."
 *
 * `headers()` se espera con await: en Next 16 el acceso sincrono a las APIs de
 * peticion fue eliminado (guia de actualizacion a la 16).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Para paginas que exigen sesion. Redirige al login si no hay. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
