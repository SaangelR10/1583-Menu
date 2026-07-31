import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-1583-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const sans = Plus_Jakarta_Sans({
  variable: "--font-1583-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Panel Admin — Café 1583",
    template: "%s | Café 1583 Admin",
  },
  description: "Panel de administración del menú digital de Café 1583.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
