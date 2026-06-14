import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export const metadata: Metadata = {
  title: "cekio — On-Chain Cheque",
  description: "Zincir üstü çek: vade tarihinde otomatik ödeme, lend ile getiri, ciro edilebilir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <header className="border-b border-white/10">
            <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-4">
              <nav className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold">
                  çek<span className="text-accent">io</span>
                </Link>
                <Link href="/" className="text-sm text-muted hover:text-white">
                  Pano
                </Link>
                <Link href="/create" className="text-sm text-muted hover:text-white">
                  Çek Oluştur
                </Link>
              </nav>
              <ConnectButton showBalance={false} />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
