import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Restaurant Website Gap Finder — Operational B2B Lead Intelligence",
  description:
    "Discover established restaurants with high customer volume and no official website. Real Google Places API integration, automated website verification, zero-fabrication research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased selection:bg-emerald-500/20 selection:text-emerald-300`}>
        {children}
      </body>
    </html>
  );
}
