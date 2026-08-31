/**
 * Punto de entrada de Better Auth (docs/01).
 *
 * Atiende todo lo de /api/auth/*: inicio y cierre de sesion, y la consulta de
 * la sesion actual. La logica esta en `src/lib/auth.ts`.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
