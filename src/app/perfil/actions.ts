/**
 * Guardar el perfil elegido (D-24).
 *
 * Server Action: la cookie se escribe en el servidor, no desde el navegador.
 */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PERFIL_COOKIE, perfilesDisponibles } from "@/lib/perfil";
import { getSession } from "@/lib/session";

export async function elegirPerfil(formData: FormData) {
  // Sin sesion no se elige nada: la accion es invocable directamente.
  const session = await getSession();
  if (!session) redirect("/login");

  const perfil = String(formData.get("perfil") ?? "");
  const validos = await perfilesDisponibles();
  // Se valida contra la lista: no se acepta un nombre arbitrario del formulario.
  if (!validos.includes(perfil)) redirect("/perfil?error=1");

  const destino = String(formData.get("destino") ?? "/") || "/";

  const store = await cookies();
  store.set(PERFIL_COOKIE, perfil, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    // Que dure lo mismo que la sesion, para no volver a preguntar (D-23).
    maxAge: Number(process.env.SESSION_IDLE_MINUTES ?? 43200) * 60,
  });

  // Redirige a una ruta interna propia, nunca a lo que venga del formulario sin
  // revisar: un destino externo convertiria esto en un redirector abierto.
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}

export async function cambiarPerfil() {
  const store = await cookies();
  store.delete(PERFIL_COOKIE);
  redirect("/perfil");
}
