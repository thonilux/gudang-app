import type { Metadata } from "next";
import "./globals.css";

import { ThemeInitScript } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Gudang",
  description: "Sistem operasional rental yang berfokus pada kesehatan peralatan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
