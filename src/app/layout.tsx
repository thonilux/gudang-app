import type { Metadata } from "next";
import "./globals.css";

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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
