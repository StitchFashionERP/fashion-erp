import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "STITCH Fashion ERP",
    template: "%s | STITCH Fashion ERP",
  },
  description:
    "Fashion ERP voor verkoop, inkoop, voorraad, facturatie en supply intelligence.",
  applicationName: "STITCH Fashion ERP",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "STITCH Fashion ERP",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "STITCH Fashion ERP",
    description:
      "Fashion ERP voor verkoop, inkoop, voorraad en facturatie.",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "STITCH Fashion ERP",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={geist.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
