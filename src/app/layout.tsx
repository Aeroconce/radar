/**
 * Envoltorio de toda la aplicacion.
 *
 * Tipografia: **IBM Plex Sans** para la interfaz y **IBM Plex Mono** para codigos
 * y cifras. Es una familia pensada para contextos tecnicos, con numerales de
 * ancho fijo — y el tablero es casi puro monto, fecha y puntaje. Los codigos de
 * licitacion (`2413-20-LE26`) se leen mucho mejor en mono que en proporcional.
 *
 * `lang="es"`: la interfaz esta en espanol neutro (RN-04). Con `lang="en"` los
 * lectores de pantalla pronunciarian el contenido en ingles.
 */
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Radar de Licitaciones",
    template: "%s · Radar de Licitaciones",
  },
  description:
    "Herramienta interna de Aeroconce para encontrar, ordenar y registrar licitaciones públicas de Mercado Público.",
  // Es una herramienta interna: no debe aparecer en buscadores.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
