import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "🌍 World Meeting Time – Coordiná horarios internacionales",
  description: "Encontrá los horarios laborales en común entre ciudades de todo el mundo.",
  openGraph: {
    title: "🌍 World Meeting Time",
    description: "Coordiná reuniones internacionales sin estrés.",
    url: "https://antonelapisciolari.github.io/world-meeting-time",
    siteName: "World Meeting Time",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
        locale: "es_ES",
        type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
