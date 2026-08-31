/**
 * Acceso al radar (RF-12, docs/09).
 *
 * Una sola cuenta compartida por el equipo (D-22). No hay registro publico ni
 * recuperacion de contrasena: la cuenta la crea la semilla.
 *
 * Mismo lenguaje visual que los correos: azul institucional, tipografia sobria,
 * nada decorativo. Es una puerta, no una portada.
 *
 * Vive aparte de la pagina porque usa `useSearchParams`, que Next exige envolver
 * en una frontera de Suspense para poder prerenderizar la ruta.
 */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("destino") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Marcada por defecto: el equipo entra desde sus propios equipos. Quien use
  // uno prestado la desmarca y la sesion muere al cerrar el navegador.
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const { error: fallo } = await signIn.email({ email, password, rememberMe: recordar });

    if (fallo) {
      // Sin detallar si fallo el correo o la clave: decirlo ayuda a quien prueba
      // credenciales, no a quien las tiene.
      setError("No pudimos entrar con esos datos. Revisa el correo y la contraseña.");
      setEnviando(false);
      return;
    }

    router.push(destino);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Aeroconce
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Radar de Licitaciones
          </h1>
        </div>

        <form
          onSubmit={entrar}
          className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-neutral-700"
              >
                Correo
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-[#1c2f4a] focus:ring-2 focus:ring-[#1c2f4a]/15"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-neutral-700 select-none">
            <input
              type="checkbox"
              checked={recordar}
              onChange={(e) => setRecordar(e.target.checked)}
              className="size-4 rounded border-neutral-300 accent-[#1c2f4a]"
            />
            Mantener la sesión iniciada
          </label>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 w-full rounded-md bg-[#1c2f4a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16253b] focus:outline-none focus:ring-2 focus:ring-[#1c2f4a]/40 disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

      </div>
    </main>
  );
}
