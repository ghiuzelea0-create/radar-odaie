import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arca Operations | Controlul fabricii",
  description: "Platformă operațională pentru proiectele și producția Arca Interiors.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-svh antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
