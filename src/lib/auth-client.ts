/**
 * Cliente de Better Auth para el navegador (docs/09).
 *
 * Solo lo usa el formulario de inicio de sesion. Todo lo demas se resuelve en el
 * servidor: la interfaz nunca decide si alguien tiene acceso.
 */
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export const { signIn, signOut, useSession } = authClient;
