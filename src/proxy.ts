/**
 * Proxy de Next (docs/01, RF-12).
 *
 * OJO: en Next 16 esto se llama `proxy`, no `middleware`. El nombre viejo esta
 * deprecado; verificable en node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md.
 *
 * Aqui **solo** se mira si existe la cookie de sesion. La documentacion advierte
 * que el proxy puede desplegarse en un CDN y no debe depender de modulos
 * compartidos, asi que no toca la base de datos: la sesion se valida de verdad
 * en el servidor, en `requireSession()`.
 *
 * Sirve para evitar que una peticion sin sesion llegue siquiera a renderizar.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

export function proxy(request: NextRequest) {
  const tieneCookie =
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(`__Secure-${SESSION_COOKIE}`);

  if (tieneCookie) return NextResponse.next();

  const login = new URL("/login", request.url);
  // Para volver a donde iba despues de entrar.
  login.searchParams.set("destino", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Todo queda protegido salvo el login, la propia API de sesion, el estado de
  // salud (lo consulta el monitoreo sin sesion, docs/09) y los estaticos.
  matcher: ["/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico).*)"],
};
