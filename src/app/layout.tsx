import type { Metadata } from "next";
import { Inter, Fraunces, Tiro_Devanagari_Sanskrit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const tiroDevanagari = Tiro_Devanagari_Sanskrit({
  variable: "--font-tiro-devanagari",
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vismay — Explore. Understand. Stay Curious.",
  description:
    "Vismay (विस्मय) is a curiosity-first personal learning companion. Ask one question, learn at your own depth, explore reliable sources, and preserve your exact journey of discovery.",
  keywords: [
    "Vismay",
    "learning",
    "curiosity",
    "knowledge",
    "research",
    "AI learning companion",
  ],
  authors: [{ name: "Vismay" }],
  openGraph: {
    title: "Vismay — Explore. Understand. Stay Curious.",
    description:
      "A curiosity-first personal learning companion. Start with one question, learn at your preferred depth, and preserve your exact journey of discovery.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${fraunces.variable} ${tiroDevanagari.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
