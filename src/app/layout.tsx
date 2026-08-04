import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuportIF",
  description: "Plataforma aberta de estudos com trilhas, missões, revisões e simulados."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
