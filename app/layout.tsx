import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Dama de Lima",
  description: "Videojuego de plataformas 2D inspirado en Lima"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
