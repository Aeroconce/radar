/**
 * Enlace de la barra lateral que sabe si es la seccion actual.
 *
 * Cliente porque `usePathname` lo exige. Marcar la seccion activa evita tener
 * que leer la URL para saber donde uno esta.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const ruta = usePathname();
  // El tablero es la raiz: seria "activo" en todas las rutas si se compara por prefijo.
  const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
        activo
          ? "bg-[#1c2f4a] font-medium text-white"
          : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {children}
    </Link>
  );
}
