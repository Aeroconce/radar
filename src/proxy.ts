/**
 * Proxy de Next (docs/01, RF-12).
 *
 * OJO: en Next 16 esto se llama `proxy`, no `middleware`. El nombre viejo esta
 * deprecado; verificable en node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md.
 *
 * Aqui **solo** se mira si existen las cookies. La documentacion advierte que el
 * proxy puede desplegarse en un CDN y no debe depender de modulos compartidos,
 * asi que no toca la base: la sesion se valida de verdad en `requireSession()` y
 * el perfil en `perfilParaEscribir()`.
 *
 * Dos puertas, en orden:
 *   1. sin sesion            -> /login
 *   2. con sesion, sin perfil -> /perfil   (D-24)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const PERFIL_COOKIE = "radar_perfil";

function tieneSesion(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  );
}

export function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  const destino = ruta + request.nextUrl.search;

  if (!tieneSesion(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("destino", destino);
    return NextResponse.redirect(login);
  }

  // La pantalla de perfil no puede exigir perfil: seria un ciclo.
  if (ruta !== "/perfil" && !request.cookies.has(PERFIL_COOKIE)) {
    const perfil = new URL("/perfil", request.url);
    perfil.searchParams.set("destino", destino);
    return NextResponse.redirect(perfil);
  }

  return NextResponse.next();
}

export const config = {
  // Todo queda protegido salvo el login, la propia API de sesion, el estado de
  // salud (lo consulta el monitoreo sin sesion, docs/09) y los estaticos.
  matcher: ["/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};
