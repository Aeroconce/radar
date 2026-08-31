/**
 * Autenticacion (docs/09, RF-12).
 *
 * Una sola cuenta compartida por el equipo (D-22). No es lo ideal —una cuenta por
 * persona daria atribucion real— pero para tres personas que se conocen resuelve
 * lo que importa: que la pagina no sea legible por cualquiera que la encuentre.
 *
 * El nombre de quien deja una nota **no** sale de la sesion: se elige al guardar
 * la revision y queda en `Review.authorName`. Por eso la sesion compartida no
 * impide saber quien escribio cada cosa.
 *
 * Sin registro publico: la cuenta la crea la semilla.
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

/** Nombre de la cookie de sesion. Lo usa el proxy para saber si vale la pena seguir. */
export const SESSION_COOKIE = "better-auth.session_token";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // docs/09: los usuarios los crea el Administrador, no hay registro publico.
    disableSignUp: true,
    minPasswordLength: 12,
  },

  user: {
    // Sin declararlos, la sesion no trae `role` ni `active` aunque esten en la
    // tabla: Better Auth solo devuelve los campos que conoce.
    additionalFields: {
      role: { type: "string", input: false, required: false },
      active: { type: "boolean", input: false, required: false },
    },
  },

  session: {
    // Cierre por inactividad (docs/09): la sesion dura SESSION_IDLE_MINUTES y
    // `updateAge: 0` la renueva en cada peticion, asi que el reloj cuenta desde
    // el ultimo uso y no desde el inicio de sesion.
    expiresIn: env.SESSION_IDLE_MINUTES * 60,
    updateAge: 0,
  },

  advanced: {
    // El radar corre detras de nginx con TLS; la cookie no debe viajar en claro.
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
  },
});

export type Session = typeof auth.$Infer.Session;
