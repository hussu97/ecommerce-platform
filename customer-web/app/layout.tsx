import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/Footer";
import { CartInitializer } from "@/components/CartInitializer";
import { I18nInitializer } from "@/components/I18nInitializer";
import { I18nLayoutEffect } from "@/components/I18nLayoutEffect";

export const metadata: Metadata = {
  title: "7alaa",
  description: "7alaa — your space for refined living",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;500;600;700&family=Noto+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f8f7f6] text-[#181511]">
        <CartInitializer />
        <I18nInitializer />
        <I18nLayoutEffect />
        <Navbar />
        <main className="flex-1 w-full max-w-[430px] md:max-w-6xl mx-auto px-0 md:px-6 md:shadow-2xl min-h-[100dvh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
