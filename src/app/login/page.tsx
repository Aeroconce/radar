/**
 * Ruta de acceso (RF-12).
 *
 * El formulario va envuelto en Suspense: usa `useSearchParams` para saber a donde
 * volver despues de entrar, y sin la frontera Next no puede prerenderizar la ruta.
 */
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-50" />}>
      <LoginForm />
    </Suspense>
  );
}
