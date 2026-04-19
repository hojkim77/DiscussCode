import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiscussCode",
  description: "Trending repos, hot issues, and developer discussions — all in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <header className="border-b border-gray-800 px-6 py-4">
          <nav className="max-w-6xl mx-auto flex gap-6 text-sm font-medium">
            <a href="/" className="text-white font-bold text-lg">DiscussCode</a>
            <a href="/trending" className="text-gray-400 hover:text-white transition-colors">Trending</a>
            <a href="/issues" className="text-gray-400 hover:text-white transition-colors">Issues</a>
            <a href="/discussions" className="text-gray-400 hover:text-white transition-colors">Discussions</a>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
