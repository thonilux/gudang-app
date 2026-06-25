import type { Metadata } from "next";
import "./globals.css";

import { ThemeInitScript } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "EMJI JAYA - Sistem Manajemen Inventaris & Gudang",
  description: "Sistem operasional rental dan kendali stok gudang yang berfokus pada pelacakan, pemeliharaan, dan kesehatan peralatan.",
  metadataBase: new URL("https://gudang.emjijaya.com"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logoMJ.png",
  },
  openGraph: {
    title: "EMJI JAYA - Sistem Manajemen Inventaris & Gudang",
    description: "Sistem operasional rental dan kendali stok gudang yang berfokus pada pelacakan, pemeliharaan, dan kesehatan peralatan.",
    url: "https://gudang.emjijaya.com",
    siteName: "EMJI JAYA",
    images: [
      {
        url: "/emji+tulisan.png",
        width: 1200,
        height: 630,
        alt: "EMJI JAYA Logo Branding",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EMJI JAYA - Sistem Manajemen Inventaris & Gudang",
    description: "Sistem operasional rental dan kendali stok gudang yang berfokus pada pelacakan, pemeliharaan, dan kesehatan peralatan.",
    images: ["/emji+tulisan.png"],
  },
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
