import type { Metadata } from "next";
import "./globals.css";
import "./hulk.css";

export const metadata: Metadata = {
  title: "Caderno de Pesquisa · Controle Preditivo",
  description: "Estudos, experimentos e descobertas. UFC · Iniciação científica.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
