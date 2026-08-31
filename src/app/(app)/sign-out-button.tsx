/** Cerrar sesion. Cliente porque necesita el click y redirigir despues. */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  return (
    <button
      type="button"
      disabled={saliendo}
      onClick={async () => {
        setSaliendo(true);
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
    >
      {saliendo ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
