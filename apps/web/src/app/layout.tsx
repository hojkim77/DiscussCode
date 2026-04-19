import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/layout/side-nav";
import { MobileHeader } from "@/components/layout/mobile-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DiscussCode",
  description: "Trending repos, hot issues, and developer discussions — all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.className} bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased`}
      >
        <SideNav />
        <MobileHeader />
        <main className="flex-1 md:ml-64 p-6 md:p-12 lg:p-20 w-full max-w-[1600px]">
          {children}
        </main>
      </body>
    </html>
  );
}
